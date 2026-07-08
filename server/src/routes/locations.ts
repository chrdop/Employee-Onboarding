import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HR_ROLES, requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const isHr = HR_ROLES.includes(req.user!.role);
  const locations = await prisma.location.findMany({
    where: isHr ? {} : { id: req.user!.locationId ?? "__none__" },
    include: { contacts: true, interfaceContacts: true },
    orderBy: { shortCode: "asc" },
  });
  res.json(locations);
});

router.get("/:id", async (req, res) => {
  const location = await prisma.location.findUnique({
    where: { id: req.params.id },
    include: { contacts: true, interfaceContacts: true },
  });
  if (!location) return res.status(404).json({ error: "Location not found" });
  if (!HR_ROLES.includes(req.user!.role) && req.user!.locationId !== location.id) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  res.json(location);
});

// --- Setup-only mutations below ---
router.use(requireRole(...HR_ROLES));

const locationSchema = z.object({
  mandantNr: z.string().min(1),
  shortCode: z.string().min(1),
  hotelName: z.string().min(1),
  address: z.string().nullable().optional(),
  plzOrt: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  generalEmail: z.string().nullable().optional(),
  roomCount: z.number().int().nullable().optional(),
  billingAddressBlock: z.string().nullable().optional(),
  legalEntity: z.string().nullable().optional(),
  vatId: z.string().nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  nextEmployeeNumber: z.number().int().min(1).optional(),
});

router.post("/", async (req, res) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const location = await prisma.location.create({ data: parsed.data });
  res.status(201).json(location);
});

router.patch("/:id", async (req, res) => {
  const parsed = locationSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const location = await prisma.location.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(location);
});

// No hard delete: locations may have active employee cases attached.
// Deactivating keeps history intact while hiding it from active views.
router.post("/:id/deactivate", async (req, res) => {
  const activeEmployeeCount = await prisma.employee.count({ where: { locationId: req.params.id } });
  const location = await prisma.location.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ location, warning: activeEmployeeCount > 0 ? `${activeEmployeeCount} employee(s) still reference this location` : null });
});

router.post("/:id/reactivate", async (req, res) => {
  const location = await prisma.location.update({ where: { id: req.params.id }, data: { isActive: true } });
  res.json(location);
});

const contactSchema = z.object({
  role: z.string().min(1),
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

router.post("/:id/contacts", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const contact = await prisma.locationContact.create({ data: { ...parsed.data, locationId: req.params.id } });
  res.status(201).json(contact);
});

router.patch("/:id/contacts/:contactId", async (req, res) => {
  const parsed = contactSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const contact = await prisma.locationContact.update({ where: { id: req.params.contactId }, data: parsed.data });
  res.json(contact);
});

router.delete("/:id/contacts/:contactId", async (req, res) => {
  await prisma.locationContact.delete({ where: { id: req.params.contactId } });
  res.status(204).end();
});

const interfaceContactSchema = z.object({
  type: z.string().min(1),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

router.post("/:id/interface-contacts", async (req, res) => {
  const parsed = interfaceContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const contact = await prisma.locationInterfaceContact.create({ data: { ...parsed.data, locationId: req.params.id } });
  res.status(201).json(contact);
});

router.patch("/:id/interface-contacts/:contactId", async (req, res) => {
  const parsed = interfaceContactSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const contact = await prisma.locationInterfaceContact.update({
    where: { id: req.params.contactId },
    data: parsed.data,
  });
  res.json(contact);
});

router.delete("/:id/interface-contacts/:contactId", async (req, res) => {
  await prisma.locationInterfaceContact.delete({ where: { id: req.params.contactId } });
  res.status(204).end();
});

export default router;
