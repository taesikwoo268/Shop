import "dotenv/config";
import { prisma } from "../database/prisma.js";
import { hashPassword } from "../utils/password.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !email.includes("@") || !password || password.length < 8) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 8 characters) before running this command.",
  );
  process.exit(1);
}

try {
  const passwordHash = await hashPassword(password);
  const role = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, roleId: role.id, status: "ACTIVE" },
    create: { email, passwordHash, roleId: role.id },
  });

  console.log(`Admin account is ready: ${email}`);
} finally {
  await prisma.$disconnect();
}
