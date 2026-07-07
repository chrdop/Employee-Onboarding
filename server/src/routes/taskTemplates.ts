import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HR_ROLES, requireAuth, requireRole } from "../middleware/auth";
import { storage } from "../services/storage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(requireAuth);

// Every authenticated role can read the catalog (needed to render task detail).
router.get("/", async (_req, res) => {
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    include: { resources: true },
    orderBy: { position: "asc" },
  });
  res.json(templates);
});

// --- Setup-only mutations below ---
router.use(requireRole(...HR_ROLES));

const templateSchema = z.object({
  title: z.string().min(1),
  descriptionWhatHow: z.string().nullable().optional(),
  position: z.number().int().optional(),
  defaultDueDays: z.number().int().nullable().optional(),
  defaultReminderDays: z.number().int().nullable().optional(),
});

router.post("/", async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const template = await prisma.taskTemplate.create({ data: parsed.data });
  res.status(201).json(template);
});

router.patch("/:id", async (req, res) => {
  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const template = await prisma.taskTemplate.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(template);
});

// Soft delete: keeps history on existing task instances intact.
router.delete("/:id", async (req, res) => {
  await prisma.taskTemplate.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(204).end();
});

const linkResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});

router.post("/:id/resources/link", async (req, res) => {
  const parsed = linkResourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const resource = await prisma.taskResource.create({
    data: {
      taskTemplateId: req.params.id,
      type: "link",
      title: parsed.data.title,
      urlOrFilePath: parsed.data.url,
      uploadedById: req.user!.userId,
    },
  });
  res.status(201).json(resource);
});

router.post("/:id/resources/document", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const title = (req.body.title as string) || req.file.originalname;
  const storedPath = await storage.save(req.file.originalname, req.file.buffer);
  const resource = await prisma.taskResource.create({
    data: {
      taskTemplateId: req.params.id,
      type: "document",
      title,
      urlOrFilePath: storedPath,
      uploadedById: req.user!.userId,
    },
  });
  res.status(201).json({ ...resource, url: storage.resolveUrl(storedPath) });
});

router.delete("/:id/resources/:resourceId", async (req, res) => {
  const resource = await prisma.taskResource.findUnique({ where: { id: req.params.resourceId } });
  if (!resource) return res.status(404).json({ error: "Resource not found" });
  if (resource.type === "document") {
    await storage.delete(resource.urlOrFilePath);
  }
  await prisma.taskResource.delete({ where: { id: req.params.resourceId } });
  res.status(204).end();
});

export default router;
