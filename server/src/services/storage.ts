import fs from "fs";
import path from "path";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";

/**
 * Storage adapter interface for task-resource files (form templates, not
 * personal employee documents — those stay in PeopleDoc). Call sites never
 * touch the filesystem or database directly, so swapping the backend (e.g.
 * for an S3-compatible one) only means implementing this interface again.
 */
export interface StorageAdapter {
  save(originalName: string, buffer: Buffer, contentType?: string): Promise<string>; // returns a stored key
  resolveUrl(storedPath: string): string; // public-facing URL/path to fetch the file
  delete(storedPath: string): Promise<void>;
}

/**
 * Keeps files in PostgreSQL (`stored_files`): Replit Autoscale has no
 * persistent filesystem, but the database survives restarts and republishes.
 * Fine for a handful of small form templates (upload limit is 20 MB).
 *
 * Files uploaded before this existed live on local disk and are still
 * referenced by their old file name; they keep being served from disk
 * (see routes/uploads.ts) and removed from disk on delete.
 */
class DbStorage implements StorageAdapter {
  private readonly legacyRoot = path.resolve(env.uploadDir);

  async save(originalName: string, buffer: Buffer, contentType?: string): Promise<string> {
    const file = await prisma.storedFile.create({
      data: { filename: originalName, contentType: contentType ?? null, data: buffer },
      select: { id: true },
    });
    return file.id;
  }

  resolveUrl(storedPath: string): string {
    return `/uploads/${storedPath}`;
  }

  async delete(storedPath: string): Promise<void> {
    await prisma.storedFile.deleteMany({ where: { id: storedPath } });
    const legacy = path.join(this.legacyRoot, path.basename(storedPath));
    if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
  }
}

export const storage: StorageAdapter = new DbStorage();
