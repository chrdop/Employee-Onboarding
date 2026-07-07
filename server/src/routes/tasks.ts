import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { canAccessLocation, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

async function loadTaskWithEmployee(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { employee: true },
  });
}

router.get("/:id", async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      employee: { include: { location: true } },
      template: { include: { resources: true } },
      feedback: true,
      events: { orderBy: { timestamp: "desc" }, include: { user: { select: { id: true, name: true } } } },
      assignedToUser: { select: { id: true, name: true } },
    },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!canAccessLocation(req.user!, task.employee.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  res.json(task);
});

const updateSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  notRequiredReason: z.string().min(1).optional(),
  assignedToUserId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  reminderIntervalDays: z.number().int().nullable().optional(),
});

router.patch("/:id", async (req, res) => {
  const existing = await loadTaskWithEmployee(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });
  if (!canAccessLocation(req.user!, existing.employee.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const data = parsed.data;

  if (data.status === "not_required" && !data.notRequiredReason) {
    return res.status(400).json({ error: "notRequiredReason is required when marking a task as not required" });
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status: data.status,
      notRequiredReason: data.status === "not_required" ? data.notRequiredReason : existing.notRequiredReason,
      assignedToUserId: data.assignedToUserId,
      dueDate: data.dueDate,
      reminderIntervalDays: data.reminderIntervalDays,
    },
  });

  const events: string[] = [];
  if (data.status && data.status !== existing.status) {
    events.push(
      data.status === "not_required"
        ? `Status changed to "not required": ${data.notRequiredReason}`
        : `Status changed from "${existing.status}" to "${data.status}"`
    );
  }
  if (data.assignedToUserId !== undefined && data.assignedToUserId !== existing.assignedToUserId) {
    events.push("Assignee changed");
  }
  if (data.reminderIntervalDays !== undefined && data.reminderIntervalDays !== existing.reminderIntervalDays) {
    events.push(`Reminder interval set to ${data.reminderIntervalDays ?? "none"} day(s)`);
  }
  for (const text of events) {
    await prisma.taskEvent.create({
      data: { taskId: task.id, eventType: "update", text, userId: req.user!.userId },
    });
  }

  res.json(task);
});

// --- Feedback (separate from task status) ---

const feedbackUpdateSchema = z.object({
  status: z.enum(["open", "overdue", "done"]),
});

router.patch("/:id/feedback", async (req, res) => {
  const existing = await loadTaskWithEmployee(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });
  if (!canAccessLocation(req.user!, existing.employee.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const parsed = feedbackUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const feedback = await prisma.feedbackStatus.upsert({
    where: { taskId: req.params.id },
    update: { status: parsed.data.status, respondedAt: parsed.data.status === "done" ? new Date() : undefined },
    create: { taskId: req.params.id, status: parsed.data.status },
  });
  await prisma.taskEvent.create({
    data: { taskId: req.params.id, eventType: "feedback_update", text: `Feedback status set to ${parsed.data.status}`, userId: req.user!.userId },
  });
  res.json(feedback);
});

const magicLinkSchema = z.object({
  externalContactName: z.string().min(1),
});

router.post("/:id/feedback/magic-link", async (req, res) => {
  const existing = await loadTaskWithEmployee(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });
  if (!canAccessLocation(req.user!, existing.employee.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const parsed = magicLinkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const token = crypto.randomBytes(24).toString("base64url");
  const feedback = await prisma.feedbackStatus.upsert({
    where: { taskId: req.params.id },
    update: { magicLinkToken: token, externalContactName: parsed.data.externalContactName, status: "open", requestedAt: new Date() },
    create: { taskId: req.params.id, magicLinkToken: token, externalContactName: parsed.data.externalContactName, status: "open", requestedAt: new Date() },
  });
  await prisma.taskEvent.create({
    data: {
      taskId: req.params.id,
      eventType: "magic_link_created",
      text: `Magic link generated for ${parsed.data.externalContactName}`,
      userId: req.user!.userId,
    },
  });
  res.json({ ...feedback, magicLinkPath: `/feedback/${token}` });
});

export default router;
