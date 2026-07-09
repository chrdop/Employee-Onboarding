import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_LOCATION_SHORT_CODE = "ATSALFRA";

const DEMO_EMPLOYEES: { name: string; position: string; startDate: string }[] = [
  { name: "Anna Gruber", position: "Front Office Agent", startDate: "2026-07-14" },
  { name: "Lukas Steiner", position: "Housekeeping", startDate: "2026-07-18" },
  { name: "Sophie Wagner", position: "F&B Service", startDate: "2026-07-25" },
  { name: "Markus Huber", position: "Night Auditor", startDate: "2026-08-01" },
  { name: "Julia Berger", position: "Guest Relations", startDate: "2026-08-08" },
];

async function main() {
  const deleted = await prisma.employee.deleteMany({});
  console.log(`Deleted ${deleted.count} existing employee(s) (cascaded their tasks/events/feedback).`);

  const location = await prisma.location.findUnique({ where: { shortCode: DEMO_LOCATION_SHORT_CODE } });
  if (!location) {
    throw new Error(`Location with short code ${DEMO_LOCATION_SHORT_CODE} not found.`);
  }

  // Fresh, predictable numbering (001..005) for the demo.
  await prisma.location.update({ where: { id: location.id }, data: { nextEmployeeNumber: 1 } });

  const templates = await prisma.taskTemplate.findMany({ where: { isActive: true }, orderBy: { position: "asc" } });

  for (const demo of DEMO_EMPLOYEES) {
    const startDate = new Date(demo.startDate);

    const [{ assigned }] = await prisma.$queryRaw<{ assigned: number }[]>`
      UPDATE locations SET next_employee_number = next_employee_number + 1
      WHERE id = ${location.id}
      RETURNING next_employee_number - 1 AS assigned
    `;
    const employeeNumber = String(assigned).padStart(3, "0");

    const employee = await prisma.employee.create({
      data: { locationId: location.id, name: demo.name, position: demo.position, startDate, employeeNumber },
    });

    await prisma.task.createMany({
      data: templates.map((t, i) => ({
        employeeId: employee.id,
        templateId: t.id,
        position: i,
        dueDate: t.defaultDueDays ? new Date(startDate.getTime() - t.defaultDueDays * 24 * 60 * 60 * 1000) : null,
        reminderIntervalDays: t.defaultReminderDays,
      })),
    });

    console.log(`Created ${demo.name} (#${employeeNumber}, entry ${demo.startDate}) with ${templates.length} tasks.`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
