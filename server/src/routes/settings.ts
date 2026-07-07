import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HR_ROLES, requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const settings = await prisma.systemSetting.findMany();
  res.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
});

router.use(requireRole(...HR_ROLES));

const setSchema = z.object({ value: z.string().min(1) });

router.put("/:key", async (req, res) => {
  const parsed = setSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const setting = await prisma.systemSetting.upsert({
    where: { key: req.params.key },
    update: { value: parsed.data.value },
    create: { key: req.params.key, value: parsed.data.value },
  });
  res.json(setting);
});

export default router;
