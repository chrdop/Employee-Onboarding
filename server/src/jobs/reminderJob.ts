import cron from "node-cron";
import { prisma } from "../lib/prisma";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Scans open/in-progress tasks once a day and creates in-app notifications
 * for tasks that are overdue or have hit their reminder interval. Falls back
 * to notifying that location's managers when a task has no assignee.
 * Email/Teams delivery is intentionally out of scope for now (Phase 2/4).
 */
export async function runReminderScan() {
  const today = startOfDay(new Date());

  const candidates = await prisma.task.findMany({
    where: { status: { in: ["open", "in_progress"] }, dueDate: { not: null } },
    include: { template: true, employee: { include: { location: true } }, assignedToUser: true },
  });

  for (const task of candidates) {
    if (!task.dueDate) continue;
    const dueDay = startOfDay(task.dueDate);
    const isOverdue = dueDay < today;
    const reminderDay = task.reminderIntervalDays
      ? new Date(dueDay.getTime() - task.reminderIntervalDays * 24 * 60 * 60 * 1000)
      : null;
    const isReminderDue = reminderDay ? reminderDay <= today : false;

    if (!isOverdue && !isReminderDue) continue;

    const alreadyNotifiedToday = await prisma.notification.findFirst({
      where: { relatedTaskId: task.id, createdAt: { gte: today } },
    });
    if (alreadyNotifiedToday) continue;

    const title = isOverdue ? `Overdue: ${task.template.title}` : `Reminder: ${task.template.title}`;
    const message = `${task.template.title} for ${task.employee.name} (${task.employee.location.hotelName}) ${
      isOverdue ? "is overdue" : "is due soon"
    }.`;

    let recipientIds: string[] = [];
    if (task.assignedToUserId) {
      recipientIds = [task.assignedToUserId];
    } else {
      const managers = await prisma.user.findMany({
        where: { locationId: task.employee.locationId, role: { in: ["location_manager", "location_deputy"] } },
        select: { id: true },
      });
      recipientIds = managers.map((m) => m.id);
    }

    for (const userId of recipientIds) {
      await prisma.notification.create({
        data: {
          userId,
          type: isOverdue ? "task_overdue" : "task_reminder",
          title,
          message,
          relatedTaskId: task.id,
        },
      });
    }
  }
}

export function scheduleReminderJob() {
  // Runs once a day; also kicks off once at startup so notifications aren't
  // stuck waiting for the next cron tick during local development.
  runReminderScan().catch((err) => console.error("Initial reminder scan failed:", err));
  cron.schedule("0 6 * * *", () => {
    runReminderScan().catch((err) => console.error("Scheduled reminder scan failed:", err));
  });
}
