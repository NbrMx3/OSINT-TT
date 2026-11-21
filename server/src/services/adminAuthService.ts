import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import type { AdminAuthContext, PublicAdmin } from "../types/auth";

export const adminAuthCookieName = "osintx_admin_token";
export const adminAuthCookieOptions = { httpOnly: true, sameSite: env.nodeEnv === "production" ? "strict" as const : "lax" as const, secure: env.nodeEnv === "production", path: "/" };

export async function loginAdmin(input: { email: string; password: string }): Promise<{ admin: PublicAdmin; token: string }> {
  const admin = await prisma.adminAccount.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!admin || !admin.isActive || !(await bcrypt.compare(input.password, admin.passwordHash))) throw new AppError(401, "Invalid administrator credentials", "INVALID_ADMIN_CREDENTIALS");
  await prisma.adminAccount.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  return { admin: toPublicAdmin(admin), token: createAdminAccessToken(admin) };
}

export async function getPublicAdmin(adminId: string): Promise<PublicAdmin> {
  const admin = await prisma.adminAccount.findFirst({ where: { id: adminId, isActive: true } });
  if (!admin) throw new AppError(401, "Administrator session is no longer valid", "ADMIN_SESSION_INVALID");
  return toPublicAdmin(admin);
}

export async function revokeAdminToken(adminId: string): Promise<void> {
  await prisma.adminAccount.update({ where: { id: adminId }, data: { tokenVersion: { increment: 1 } } });
}

export async function verifyAdminAccessToken(token: string): Promise<AdminAuthContext> {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & { tokenType?: string; tokenVersion?: number };
    if (payload.tokenType !== "admin" || !payload.sub || payload.tokenVersion === undefined) throw new Error("Invalid admin token claims");
    const admin = await prisma.adminAccount.findFirst({ where: { id: payload.sub, isActive: true } });
    if (!admin || admin.tokenVersion !== payload.tokenVersion) throw new Error("Admin session revoked");
    return { adminId: admin.id, tokenVersion: admin.tokenVersion };
  } catch {
    throw new AppError(401, "Invalid or expired administrator session", "ADMIN_SESSION_INVALID");
  }
}

function createAdminAccessToken(admin: { id: string; tokenVersion: number }): string {
  return jwt.sign({ tokenType: "admin", tokenVersion: admin.tokenVersion }, env.jwtSecret, { subject: admin.id, expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
}

function toPublicAdmin(admin: { id: string; email: string; name: string }): PublicAdmin {
  return { id: admin.id, email: admin.email, name: admin.name };
}
