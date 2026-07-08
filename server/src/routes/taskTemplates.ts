import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { encryptSecret } from "../lib/crypto";
import { HR_ROLES, requireAuth, requireRole } from "../middleware/auth";
import { storage } from "../services/storage";

// Never send encrypted password blobs to the client, even to HR (only the
// dedicated reveal endpoint decrypts on demand). Replace with a boolean.
function sanitizeResource<T extends { passwordEncrypted?: string | null }>(resource: T) {
  const { passwordEncrypted, ...rest } = resource;
  return { ...rest, hasCredentials: !!passwordEncrypted };
}

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
  res.json(templates.map((t) => ({ ...t, resources: t.resources.map(sanitizeResource) })));
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

const reorderSchema = z.object({
  templateId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

// Must be registered before PATCH /:id, otherwise Express would match
// "reorder" as an :id.
router.patch("/reorder", async (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
  const index = templates.findIndex((t) => t.id === parsed.data.templateId);
  if (index === -1) return res.status(404).json({ error: "Template not found" });
  const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= templates.length) {
    return res.status(400).json({ error: "Template is already at the boundary" });
  }

  const a = templates[index];
  const b = templates[swapIndex];
  await prisma.$transaction([
    prisma.taskTemplate.update({ where: { id: a.id }, data: { position: b.position } }),
    prisma.taskTemplate.update({ where: { id: b.id }, data: { position: a.position } }),
  ]);

  res.json({ ok: true });
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
  // Users naturally type bare domains ("www.ams.at") without a scheme;
  // assume https instead of rejecting the whole submission.
  url: z.preprocess(
    (val) => (typeof val === "string" && !/^https?:\/\//i.test(val) ? `https://${val}` : val),
    z.string().url()
  ),
  // Optional login for the system behind the link (e.g. KEOS/AMS/PeopleDoc),
  // so a deputy can complete the task without asking IT for access.
  username: z.string().min(1).nullable().optional(),
  password: z.string().min(1).nullable().optional(),
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
      username: parsed.data.username ?? null,
      passwordEncrypted: parsed.data.password ? encryptSecret(parsed.data.password) : null,
      uploadedById: req.user!.userId,
    },
  });
  res.status(201).json(sanitizeResource(resource));
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
