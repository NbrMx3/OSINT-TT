import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { RoleName } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import type { AuthContext, PublicUser } from "../types/auth";

const publicUserInclude = { role: { select: { name: true } } } as const;
export const authCookieName = "osintx_token";
export const authCookieOptions = { httpOnly: true, sameSite: env.nodeEnv === "production" ? "strict" as const : "lax" as const, secure: env.nodeEnv === "production", path: "/" };

export async function registerUser(input: { name: string; email: string; password: string; organizationName?: string }): Promise<{ user: PublicUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, "An account with this email already exists", "EMAIL_EXISTS");
  const role = await prisma.role.findUnique({ where: { name: RoleName.ANALYST } });
  if (!role) throw new AppError(500, "Default analyst role is not configured", "ROLE_NOT_CONFIGURED");
  const tenantName = input.organizationName?.trim() || `${input.name.trim()}'s workspace`;
  const tenant = await prisma.tenant.create({ data: { name: tenantName, slug: `${slugify(tenantName)}-${crypto.randomBytes(4).toString("hex")}` } });
  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const user = await prisma.user.create({ data: { tenantId: tenant.id, roleId: role.id, name: input.name.trim(), email: input.email.toLowerCase(), passwordHash }, include: publicUserInclude });
  return { user: toPublicUser(user), token: createAccessToken(user) };
}

export async function loginUser(input: { email: string; password: string }): Promise<{ user: PublicUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, include: publicUserInclude });
  if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { user: toPublicUser(user), token: createAccessToken(user) };
}

export async function getPublicUser(userId: string, tenantId: string): Promise<PublicUser> {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, isActive: true }, include: publicUserInclude });
  if (!user) throw new AppError(401, "User session is no longer valid", "SESSION_INVALID");
  return toPublicUser(user);
}

export async function updateProfile(userId: string, tenantId: string, input: { name?: string }): Promise<PublicUser> {
  const user = await prisma.user.update({ where: { id: userId, tenantId }, data: { name: input.name?.trim() }, include: publicUserInclude });
  return toPublicUser(user);
}

export async function revokeTokens(userId: string, tenantId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, tenantId }, data: { tokenVersion: { increment: 1 } } });
}

export async function requestPasswordReset(email: string): Promise<string | undefined> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return undefined;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  await prisma.user.update({ where: { id: user.id }, data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  return rawToken;
}

export async function resetPassword(rawToken: string, password: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { passwordResetTokenHash: hashToken(rawToken), passwordResetExpiresAt: { gt: new Date() }, isActive: true } });
  if (!user) throw new AppError(400, "Reset token is invalid or expired", "RESET_TOKEN_INVALID");
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null, tokenVersion: { increment: 1 } } });
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & { tenantId?: string; role?: RoleName; tokenVersion?: number };
    if (!payload.sub || !payload.tenantId || !payload.role || payload.tokenVersion === undefined) throw new Error("Invalid token claims");
    const user = await prisma.user.findFirst({ where: { id: payload.sub, tenantId: payload.tenantId, isActive: true }, include: { role: true } });
    if (!user || user.tokenVersion !== payload.tokenVersion || user.role.name !== payload.role) throw new Error("Session revoked");
    return { userId: user.id, tenantId: user.tenantId, role: user.role.name, tokenVersion: user.tokenVersion };
  } catch {
    throw new AppError(401, "Invalid or expired session", "SESSION_INVALID");
  }
}

function createAccessToken(user: { id: string; tenantId: string; tokenVersion: number; role: { name: RoleName } }): string {
  return jwt.sign({ tenantId: user.tenantId, role: user.role.name, tokenVersion: user.tokenVersion }, env.jwtSecret, { subject: user.id, expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
}

function toPublicUser(user: { id: string; tenantId: string; email: string; name: string; role: { name: RoleName } }): PublicUser { return { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, role: user.role.name }; }
function hashToken(token: string): string { return crypto.createHash("sha256").update(token).digest("hex"); }
function slugify(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "workspace"; }
