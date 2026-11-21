import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  for (const name of Object.values(RoleName)) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "System Administrator";
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
    await prisma.adminAccount.upsert({ where: { email }, update: { name, passwordHash: await bcrypt.hash(password, 12), isActive: true }, create: { email, name, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Seeded administrator account ${email}`);
  } else {
    console.log("ADMIN_EMAIL and ADMIN_PASSWORD are not set; no administrator account was changed");
  }
  console.log("Seeded OSINT-X roles");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
