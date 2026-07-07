-- AlterTable
ALTER TABLE "location_contacts" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "task_resources" ADD COLUMN     "password_encrypted" TEXT,
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: give existing task rows a stable initial order matching their
-- prior implicit ordering (createdAt asc) before position existed, so the
-- reorder feature starts from a sane baseline instead of an all-zero tie.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY created_at ASC) - 1 AS rn
  FROM "tasks"
)
UPDATE "tasks" t
SET "position" = ranked.rn
FROM ranked
WHERE t.id = ranked.id;
