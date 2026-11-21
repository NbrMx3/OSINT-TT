import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcrypt";
import { PERMISSIONS, permissionDefinitions } from "../src/config/permissions";

const prisma = new PrismaClient();

async function main() {
  for (const name of Object.values(RoleName)) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const permissions = new Map<string, { id: string }>();
  for (const definition of permissionDefinitions) {
    permissions.set(definition.code, await prisma.permission.upsert({ where: { code: definition.code }, update: { description: definition.description }, create: definition, select: { id: true } }));
  }
  const allPermissions = Object.values(PERMISSIONS);
  const rolePermissions: Record<RoleName, string[]> = {
    [RoleName.ADMINISTRATOR]: allPermissions,
    [RoleName.ANALYST]: [PERMISSIONS.VIEW_WORKSPACE, PERMISSIONS.COLLECT_INTELLIGENCE, PERMISSIONS.EXPORT_REPORTS, PERMISSIONS.DELETE_DATA],
    [RoleName.INVESTIGATOR]: [PERMISSIONS.VIEW_WORKSPACE, PERMISSIONS.COLLECT_INTELLIGENCE, PERMISSIONS.EXPORT_REPORTS],
    [RoleName.READ_ONLY]: [PERMISSIONS.VIEW_WORKSPACE],
  };
  for (const [roleName, codes] of Object.entries(rolePermissions) as [RoleName, string[]][]) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: codes.map((code) => ({ roleId: role.id, permissionId: permissions.get(code)!.id })) });
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "System Administrator";
  if (email && password) {
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new Error("ADMIN_PASSWORD must be at least 12 characters and include upper, lower, number, and special characters");
    await prisma.adminAccount.upsert({ where: { email }, update: { name, passwordHash: await bcrypt.hash(password, 12), isActive: true }, create: { email, name, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Seeded administrator account ${email}`);
  } else {
    console.log("ADMIN_EMAIL and ADMIN_PASSWORD are not set; no administrator account was changed");
  }
  console.log("Seeded OSINT-X roles");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
