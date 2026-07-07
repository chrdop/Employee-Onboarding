import crypto from "crypto";
import { env } from "./env";

const ALGORITHM = "aes-256-gcm";

// 32-byte key derived from the configured secret so any passphrase-shaped
// env value works, not just a raw 32-byte hex string.
function getKey(): Buffer {
  return crypto.createHash("sha256").update(env.credentialEncryptionKey).digest();
}

/** Encrypts a plaintext secret for storage. Format: iv:authTag:ciphertext, all base64. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

/** Decrypts a secret previously produced by encryptSecret. */
export function decryptSecret(stored: string): string {
  const [ivB64, authTagB64, cipherB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !cipherB64) {
    throw new Error("Malformed encrypted secret");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
