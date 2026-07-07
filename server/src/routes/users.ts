import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HR_ROLES, requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole(...HR_ROLES));

// Explicit select (rather than filtering the result afterwards) so
// passwordHash never leaves the database layer for these endpoints.
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  locationId: true,
  isDeputyForUserId: true,
  mustChangePassword: true,
} as const;

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" }, select: publicUserSelect });
  res.json(users);
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  locationId: z.string().nullable().optional(),
  isDeputyForUserId: z.string().nullable().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { name, email, role, locationId, isDeputyForUserId } = parsed.data;

  if ((role === "location_manager" || role === "location_deputy") && !locationId) {
    return res.status(400).json({ error: "locationId is required for location roles" });
  }

  const tempPassword = crypto.randomBytes(9).toString("base64url");
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      locationId: locationId ?? null,
      isDeputyForUserId: isDeputyForUserId ?? null,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true,
    },
    select: publicUserSelect,
  });
  res.status(201).json({ ...user, tempPassword });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  locationId: z.string().nullable().optional(),
  isDeputyForUserId: z.string().nullable().optional(),
});

router.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data, select: publicUserSelect });
  res.json(user);
});

router.post("/:id/reset-password", async (req, res) => {
  const tempPassword = crypto.randomBytes(9).toString("base64url");
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
  });
  res.json({ tempPassword });
});

router.delete("/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
