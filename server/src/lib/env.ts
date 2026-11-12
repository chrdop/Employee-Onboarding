import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Fallbacks below are public (they're in git) — fine for local dev, never for
// a deployed instance. Warn loudly (names only, never values) instead of
// silently running with a known key.
for (const name of ["JWT_SECRET", "CREDENTIAL_ENCRYPTION_KEY"]) {
  if (!process.env[name]) {
    console.warn(`WARNING: ${name} is not set, falling back to a publicly known development value. Set it in Replit Secrets.`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY ?? "dev-credential-key-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  isProduction: process.env.NODE_ENV === "production",
};
