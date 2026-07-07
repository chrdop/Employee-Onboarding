import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

// No auth on this router by design: external interfaces (IT/KEOS/AMS/Payroll)
// respond via a single-use magic-link token instead of a login.
const router = Router();

router.get("/feedback/:token", async (req, res) => {
  const feedback = await prisma.feedbackStatus.findUnique({
    where: { magicLinkToken: req.params.token },
    include: { task: { include: { template: true, employee: { include: { location: true } } } } },
  });
  if (!feedback) return res.status(404).json({ error: "Link not found or expired" });

  res.json({
    taskTitle: feedback.task.template.title,
    taskDescription: feedback.task.template.descriptionWhatHow,
    location: feedback.task.employee.location.hotelName,
    employeeName: feedback.task.employee.name,
    externalContactName: feedback.externalContactName,
    status: feedback.status,
    respondedAt: feedback.respondedAt,
  });
});

const respondSchema = z.object({
  status: z.enum(["open", "overdue", "done"]),
});

router.post("/feedback/:token", async (req, res) => {
  const feedback = await prisma.feedbackStatus.findUnique({ where: { magicLinkToken: req.params.token } });
  if (!feedback) return res.status(404).json({ error: "Link not found or expired" });

  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const updated = await prisma.feedbackStatus.update({
    where: { id: feedback.id },
    data: { status: parsed.data.status, respondedAt: new Date() },
  });
  await prisma.taskEvent.create({
    data: {
      taskId: feedback.taskId,
      eventType: "feedback_update",
      text: `External feedback via magic link: ${parsed.data.status}${feedback.externalContactName ? ` (${feedback.externalContactName})` : ""}`,
    },
  });
  res.json(updated);
});

export default router;
