import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { canAccessLocation, HR_ROLES, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function computeOverallStatus(tasks: { status: string }[]): "not_started" | "in_progress" | "completed" {
  if (tasks.length === 0) return "not_started";
  const relevant = tasks.filter((t) => t.status !== "not_required");
  const allDone = relevant.length === 0 || relevant.every((t) => t.status === "done");
  if (allDone) return "completed";
  const anyStarted = tasks.some((t) => t.status === "done" || t.status === "in_progress");
  return anyStarted ? "in_progress" : "not_started";
}

router.get("/", async (req, res) => {
  const locationId = req.query.locationId as string | undefined;
  if (locationId && !canAccessLocation(req.user!, locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const isHr = HR_ROLES.includes(req.user!.role);
  const where = locationId ? { locationId } : isHr ? {} : { locationId: req.user!.locationId ?? "__none__" };

  const employees = await prisma.employee.findMany({
    where,
    include: { tasks: { select: { status: true } }, location: { select: { id: true, hotelName: true, shortCode: true } } },
    orderBy: { startDate: "desc" },
  });

  res.json(
    employees.map((e) => ({
      id: e.id,
      locationId: e.locationId,
      location: e.location,
      employeeNumber: e.employeeNumber,
      name: e.name,
      position: e.position,
      startDate: e.startDate,
      peopledocReference: e.peopledocReference,
      overallStatus: computeOverallStatus(e.tasks),
      taskCounts: {
        total: e.tasks.length,
        open: e.tasks.filter((t) => t.status === "open").length,
        inProgress: e.tasks.filter((t) => t.status === "in_progress").length,
        done: e.tasks.filter((t) => t.status === "done").length,
        notRequired: e.tasks.filter((t) => t.status === "not_required").length,
      },
    }))
  );
});

router.get("/:id", async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: {
      location: true,
      tasks: {
        include: { template: true, feedback: true, assignedToUser: { select: { id: true, name: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  if (!canAccessLocation(req.user!, employee.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  res.json({ ...employee, overallStatus: computeOverallStatus(employee.tasks) });
});

const createSchema = z.object({
  locationId: z.string().min(1),
  employeeNumber: z.string().nullable().optional(),
  name: z.string().min(1),
  position: z.string().nullable().optional(),
  startDate: z.coerce.date(),
  peopledocReference: z.string().nullable().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  if (!canAccessLocation(req.user!, parsed.data.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const employee = await prisma.employee.create({ data: parsed.data });

  // Every employee gets the full global task catalog from day one.
  const templates = await prisma.taskTemplate.findMany({ where: { isActive: true }, orderBy: { position: "asc" } });
  await prisma.task.createMany({
    data: templates.map((t, i) => ({
      employeeId: employee.id,
      templateId: t.id,
      position: i,
      dueDate: t.defaultDueDays
        ? new Date(parsed.data.startDate.getTime() + t.defaultDueDays * 24 * 60 * 60 * 1000)
        : null,
      reminderIntervalDays: t.defaultReminderDays,
    })),
  });

  const full = await prisma.employee.findUnique({
    where: { id: employee.id },
    include: { tasks: { include: { template: true } } },
  });
  res.status(201).json(full);
});

const reorderSchema = z.object({
  taskId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

router.patch("/:employeeId/tasks/reorder", async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.employeeId } });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  if (!canAccessLocation(req.user!, employee.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const tasks = await prisma.task.findMany({
    where: { employeeId: req.params.employeeId },
    orderBy: { position: "asc" },
  });
  const index = tasks.findIndex((t) => t.id === parsed.data.taskId);
  if (index === -1) return res.status(404).json({ error: "Task not found for this employee" });
  const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= tasks.length) {
    return res.status(400).json({ error: "Task is already at the boundary" });
  }

  const a = tasks[index];
  const b = tasks[swapIndex];
  await prisma.$transaction([
    prisma.task.update({ where: { id: a.id }, data: { position: b.position } }),
    prisma.task.update({ where: { id: b.id }, data: { position: a.position } }),
  ]);

  res.json({ ok: true });
});

const updateSchema = createSchema.partial();

router.patch("/:id", async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  if (!canAccessLocation(req.user!, employee.locationId)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await prisma.employee.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(updated);
});

export default router;
