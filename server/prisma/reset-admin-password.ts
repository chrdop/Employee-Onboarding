import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function randomPassword(length = 14): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

async function main() {
  const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? "admin@onboarding.local";
  const newPassword = process.argv[3] ?? randomPassword();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: true,
    },
  });

  console.log("─────────────────────────────────────────────");
  console.log(" Password reset:");
  console.log(` Email:    ${email}`);
  console.log(` Password: ${newPassword}`);
  console.log(" (must be changed on next login)");
  console.log("─────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
