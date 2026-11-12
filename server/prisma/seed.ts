import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Real master data extracted from "Übersicht Mandanten Hotels Österreich" (client-provided Excel).
const locations = [
  {
    mandantNr: "1030",
    shortCode: "ATVIEMAT",
    hotelName: "Leonardo Hotel Vienna Westbahnhof",
    address: "Matrosengasse 6-8",
    plzOrt: "1060 Vienna",
    phone: "+43 15 99010",
    fax: "+43 15 99019 00",
    generalEmail: "info.viennawestbahnhof@leonardo-hotels.com",
    roomCount: 213,
    legalEntity: "Sunflower Management GmbH & Co. KG",
    vatId: "ATU72416218",
    taxNumber: "37/083/45896",
  },
  {
    mandantNr: "470",
    shortCode: "ATVIEGRA",
    hotelName: "Leonardo Hotel Vienna City West",
    address: "Graumanngasse 3-5",
    plzOrt: "1150 Vienna",
    phone: "+43 1 418 00 55",
    fax: null,
    generalEmail: "info.viennacitywest@leonardo-hotels.com",
    roomCount: 211,
    legalEntity: "Leonardo Graumanngasse Wien GmbH (FN 475052g)",
    vatId: "ATU72564227",
    taxNumber: "09 297/7230",
  },
  {
    mandantNr: "454",
    shortCode: "ATVIEGER",
    hotelName: "Leonardo Vienna Hauptbahnhof",
    address: "Gerhard-Bronner-Straße 5",
    plzOrt: "1100 Wien",
    phone: "+43 1 2359009",
    fax: "+43 1 23 59 009 99",
    generalEmail: "info.viennahauptbahnhof@leonardo-hotels.com",
    roomCount: 300,
    legalEntity: "Leonardo Hotels Austria Opco GmbH",
    vatId: "ATU62458236",
    taxNumber: "07 296/5015",
  },
  {
    mandantNr: "455",
    shortCode: "ATVIELIN",
    hotelName: "Leonardo Vienna Schönbrunn",
    address: "Linke Wienzeile 224",
    plzOrt: "1150 Wien",
    phone: "+43 (0)1 33 66 222",
    fax: "+43 (0)1 33 66 222 122 22",
    generalEmail: "info.viennaschoenbrunn@leonardo-hotels.com",
    roomCount: 283,
    legalEntity: "Leonardo Hotels Austria Opco GmbH",
    vatId: "ATU62458236",
    taxNumber: "07 296/5015",
  },
  {
    mandantNr: "453",
    shortCode: "ATSALHIL",
    hotelName: "Leonardo Salzburg City Center",
    address: "Hildmannplatz 5",
    plzOrt: "5020 Salzburg",
    phone: "+43 (0)662 846 846",
    fax: "+43 (0)662 846 846 700",
    generalEmail: "info.salzburgcitycenter@leonardo-hotels.com",
    roomCount: 86,
    legalEntity: "Leonardo Hotels Austria Opco GmbH",
    vatId: "ATU62458236",
    taxNumber: "07 296/5015",
  },
  {
    mandantNr: "452",
    shortCode: "ATSALRIC",
    hotelName: "Leonardo Boutique Salzburg Gablerbräu",
    address: "Richard-Mayr-Gasse 2",
    plzOrt: "5020 Salzburg",
    phone: "+43 (0)662 879 662",
    fax: "+43 (0)662 234 662 226",
    generalEmail: "info.boutiquesalzburg@leonardo-hotels.com",
    roomCount: 71,
    legalEntity: "Leonardo Hotels Austria Opco GmbH",
    vatId: "ATU62458236",
    taxNumber: "07 296/5015",
  },
  {
    mandantNr: "451",
    shortCode: "ATSALFRA",
    hotelName: "Leonardo Salzburg Airport",
    address: "Franz Brötzner Straße 15",
    plzOrt: "5071 Wals Siezenheim",
    phone: "+43 (0)662 855 525",
    fax: "+43 (0)662 855 525 700",
    generalEmail: "info.salzburgairport@leonardo-hotels.com",
    roomCount: 90,
    legalEntity: "Leonardo Hotels Austria Opco GmbH",
    vatId: "ATU62458236",
    taxNumber: "07 296/5015",
  },
  {
    mandantNr: "456",
    shortCode: "ATLINSTE",
    hotelName: "Leonardo Boutique Linz City Center",
    address: "Steingasse 6",
    plzOrt: "4020 Linz",
    phone: "+43 (0)732 210400",
    fax: null,
    generalEmail: "info.boutiquelinz@leonardo-hotels.com",
    roomCount: 129,
    legalEntity: "Leonardo Hotels Austria Opco GmbH",
    vatId: "ATU62458236",
    taxNumber: "07 296/5015",
  },
];

// Real task catalog derived from the client-provided "Liste Onboarding" Excel columns.
const taskTemplates = [
  { title: "Angebot", description: "Send job offer to the candidate and confirm acceptance.", defaultDueDays: 3, defaultReminderDays: 1 },
  { title: "Matrix approved", description: "Get sign-off in the internal approval matrix before onboarding proceeds.", defaultDueDays: 5, defaultReminderDays: 2 },
  { title: "Ausländerbeschäftigung", description: "Check and process work-permit requirements for non-EU/EEA hires.", defaultDueDays: 14, defaultReminderDays: 3 },
  { title: "Vertrag signed PD", description: "Prepare the employment contract, get it signed, and file it in PeopleDoc.", defaultDueDays: 7, defaultReminderDays: 2 },
  { title: "Vertrag/Anmeldung da", description: "Confirm the signed contract and registration paperwork has arrived.", defaultDueDays: 7, defaultReminderDays: 2 },
  { title: "SV Anm PD + GM", description: "Register the employee for social insurance (PeopleDoc + GM confirmation).", defaultDueDays: 1, defaultReminderDays: 1 },
  { title: "KEOS", description: "Set up the employee record in the KEOS system.", defaultDueDays: 3, defaultReminderDays: 1 },
  { title: "PN KEOS OK", description: "Confirm the KEOS personnel number has been issued.", defaultDueDays: 5, defaultReminderDays: 2 },
  { title: "AMS", description: "Handle AMS (Arbeitsmarktservice) notifications or registration if applicable.", defaultDueDays: 5, defaultReminderDays: 2 },
  { title: "AT", description: "Confirm the employment start administratively.", defaultDueDays: 1, defaultReminderDays: 1 },
  { title: "DV", description: "Complete the Dienstvertrag / data-processing agreement.", defaultDueDays: 5, defaultReminderDays: 2 },
  { title: "Unterlagen da", description: "Confirm all onboarding documents have been received from the employee.", defaultDueDays: 3, defaultReminderDays: 1 },
  { title: "Unterlagen PD", description: "File the received documents in PeopleDoc.", defaultDueDays: 5, defaultReminderDays: 2 },
  { title: "Unterlagen Payer", description: "Forward the required documents to payroll.", defaultDueDays: 5, defaultReminderDays: 2 },
  { title: "Transfer in Hotel", description: "Arrange transfer/relocation logistics to the assigned hotel.", defaultDueDays: 3, defaultReminderDays: 1 },
  { title: "Info", description: "Send general onboarding information to the employee and the location.", defaultDueDays: 1, defaultReminderDays: 1 },
];

function randomPassword(length = 14): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

type SeedContact = { role: string; name: string; email: string | null; note: string | null };

// Real GM/OM names and e-mail addresses are personal data and deliberately
// NOT in git. They live in a local, git-ignored file keyed by location short
// code. Without it, locations that have no contacts yet get one clearly
// fake placeholder contact so a fresh dev setup still shows the UI.
function loadContactsFile(): Record<string, SeedContact[]> {
  const file = path.join(__dirname, "seed-contacts.local.json");
  if (!fs.existsSync(file)) {
    console.warn("WARNING: seed-contacts.local.json not found. Locations without contacts get a placeholder contact.");
    return {};
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  const contactsByLocation = loadContactsFile();

  console.log("Seeding locations...");
  for (const locationData of locations) {
    const created = await prisma.location.upsert({
      where: { shortCode: locationData.shortCode },
      update: locationData,
      create: locationData,
    });
    let contacts: SeedContact[] = contactsByLocation[locationData.shortCode] ?? [];
    if (contacts.length === 0 && (await prisma.locationContact.count({ where: { locationId: created.id } })) === 0) {
      contacts = [{ role: "GM", name: "Placeholder Contact", email: "gm@example.com", note: null }];
    }
    for (const contact of contacts) {
      const existing = await prisma.locationContact.findFirst({
        where: { locationId: created.id, name: contact.name },
      });
      if (!existing) {
        await prisma.locationContact.create({
          data: { ...contact, locationId: created.id },
        });
      }
    }
  }

  console.log("Seeding task templates...");
  for (let i = 0; i < taskTemplates.length; i++) {
    const t = taskTemplates[i];
    await prisma.taskTemplate.upsert({
      where: { id: `seed-${i}` },
      update: {
        position: i,
        title: t.title,
        descriptionWhatHow: t.description,
        defaultDueDays: t.defaultDueDays,
        defaultReminderDays: t.defaultReminderDays,
      },
      create: {
        id: `seed-${i}`,
        position: i,
        title: t.title,
        descriptionWhatHow: t.description,
        defaultDueDays: t.defaultDueDays,
        defaultReminderDays: t.defaultReminderDays,
      },
    });
  }

  console.log("Seeding system settings...");
  await prisma.systemSetting.upsert({
    where: { key: "daily_report_send_time" },
    update: {},
    create: { key: "daily_report_send_time", value: "07:00" },
  });

  console.log("Seeding initial HR-central admin user...");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@onboarding.local";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const tempPassword = randomPassword();
    await prisma.user.create({
      data: {
        name: "HR Central Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        role: "hr_central",
        mustChangePassword: true,
      },
    });
    console.log("─────────────────────────────────────────────");
    console.log(" Initial admin account created:");
    console.log(` Email:    ${adminEmail}`);
    console.log(` Password: ${tempPassword}`);
    console.log(" (must be changed on first login)");
    console.log("─────────────────────────────────────────────");
  } else {
    console.log(`Admin user ${adminEmail} already exists, skipping.`);
  }

  console.log("Seeding demo employee (example data, safe to delete)...");
  const salzburgAirport = await prisma.location.findUnique({ where: { shortCode: "ATSALFRA" } });
  const templates = await prisma.taskTemplate.findMany({ orderBy: { position: "asc" } });
  if (salzburgAirport && templates.length > 0) {
    const existingEmployee = await prisma.employee.findFirst({
      where: { locationId: salzburgAirport.id, name: "Example Employee" },
    });
    if (!existingEmployee) {
      const employee = await prisma.employee.create({
        data: {
          locationId: salzburgAirport.id,
          name: "Example Employee",
          position: "Front Office Agent",
          startDate: new Date(),
          employeeNumber: "DEMO-001",
        },
      });
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const dueDate = template.defaultDueDays
          ? new Date(Date.now() + template.defaultDueDays * 24 * 60 * 60 * 1000)
          : null;
        await prisma.task.create({
          data: {
            employeeId: employee.id,
            templateId: template.id,
            status: i === 0 ? "done" : "open",
            dueDate,
            reminderIntervalDays: template.defaultReminderDays,
          },
        });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
