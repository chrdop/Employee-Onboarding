import { Router } from "express";
import { prisma } from "../lib/prisma";
import { HR_ROLES, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

router.get("/", async (req, res) => {
  const isHr = HR_ROLES.includes(req.user!.role);
  const locationFilter = isHr ? {} : { locationId: req.user!.locationId ?? "__none__" };

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const openTasks = await prisma.task.findMany({
    where: {
      status: { in: ["open", "in_progress"] },
      employee: locationFilter,
      dueDate: { lte: in7Days },
    },
    include: {
      template: true,
      employee: { include: { location: true } },
      feedback: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const openFeedback = await prisma.feedbackStatus.findMany({
    where: {
      status: { in: ["open", "overdue"] },
      task: { employee: locationFilter },
    },
    include: { task: { include: { template: true, employee: { include: { location: true } } } } },
  });

  type Bucket = "overdue" | "dueToday" | "upcoming";
  const groupedTasks: Record<string, { hotelName: string; overdue: unknown[]; dueToday: unknown[]; upcoming: unknown[] }> = {};

  for (const task of openTasks) {
    const locId = task.employee.locationId;
    groupedTasks[locId] ??= { hotelName: task.employee.location.hotelName, overdue: [], dueToday: [], upcoming: [] };
    const bucket: Bucket = !task.dueDate
      ? "upcoming"
      : task.dueDate < today
      ? "overdue"
      : task.dueDate < tomorrow
      ? "dueToday"
      : "upcoming";
    groupedTasks[locId][bucket].push({
      taskId: task.id,
      title: task.template.title,
      employeeName: task.employee.name,
      dueDate: task.dueDate,
      status: task.status,
    });
  }

  const groupedFeedback: Record<string, { hotelName: string; items: unknown[] }> = {};
  for (const fb of openFeedback) {
    const locId = fb.task.employee.locationId;
    groupedFeedback[locId] ??= { hotelName: fb.task.employee.location.hotelName, items: [] };
    groupedFeedback[locId].items.push({
      taskId: fb.taskId,
      title: fb.task.template.title,
      employeeName: fb.task.employee.name,
      feedbackStatus: fb.status,
      externalContactName: fb.externalContactName,
    });
  }

  res.json({
    generatedAt: new Date(),
    blockA_tasks: groupedTasks,
    blockB_feedback: groupedFeedback,
    forecast7Days: openTasks
      .filter((t) => t.dueDate && t.dueDate >= tomorrow && t.dueDate <= in7Days)
      .map((t) => ({
        taskId: t.id,
        title: t.template.title,
        employeeId: t.employeeId,
        employeeName: t.employee.name,
        hotelName: t.employee.location.hotelName,
        shortCode: t.employee.location.shortCode,
        dueDate: t.dueDate,
      }))
      // Grouped by location, then by employee within it (so an employee's
      // tasks read as one block), then by due date.
      .sort(
        (a, b) =>
          a.shortCode.localeCompare(b.shortCode) ||
          a.employeeName.localeCompare(b.employeeName) ||
          a.dueDate!.getTime() - b.dueDate!.getTime()
      ),
  });
});

export default router;
