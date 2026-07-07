import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "../lib/env";

/**
 * Storage adapter interface for task-resource files (form templates, not
 * personal employee documents — those stay in PeopleDoc). Swapping the local
 * adapter for an S3-compatible one later only means implementing this
 * interface again; call sites never touch the filesystem directly.
 */
export interface StorageAdapter {
  save(originalName: string, buffer: Buffer): Promise<string>; // returns a stored path/key
  resolveUrl(storedPath: string): string; // public-facing URL/path to fetch the file
  delete(storedPath: string): Promise<void>;
}

class LocalDiskStorage implements StorageAdapter {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
    fs.mkdirSync(this.root, { recursive: true });
  }

  async save(originalName: string, buffer: Buffer): Promise<string> {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${crypto.randomUUID()}-${safeName}`;
    fs.writeFileSync(path.join(this.root, fileName), buffer);
    return fileName;
  }

  resolveUrl(storedPath: string): string {
    return `/uploads/${storedPath}`;
  }

  async delete(storedPath: string): Promise<void> {
    const full = path.join(this.root, storedPath);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
}

export const storage: StorageAdapter = new LocalDiskStorage(path.resolve(env.uploadDir));
