import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import type { AdminAuthContext, PublicAdmin } from "../types/auth";
import { buildTotpUri, consumeRecoveryCode, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, verifyTotp } from "../utils/mfa";
import { decryptSecret, encryptSecret } from "../utils/secretCrypto";

export const adminAuthCookieName = "osintx_admin_token";
export const adminAuthCookieOptions = { httpOnly: true, sameSite: env.nodeEnv === "production" ? "strict" as const : "lax" as const, secure: env.nodeEnv === "production", path: "/" };

type SessionMetadata = { userAgent?: string; ipAddress?: string };
export type AdminLoginResult = { admin: PublicAdmin; token: string } | { mfaRequired: true; challengeToken: string };

export async function loginAdmin(input: { email: string; password: string }, metadata?: SessionMetadata): Promise<AdminLoginResult> {
  const admin = await prisma.adminAccount.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!admin || !admin.isActive || !(await bcrypt.compare(input.password, admin.passwordHash))) throw new AppError(401, "Invalid administrator credentials", "INVALID_ADMIN_CREDENTIALS");
  await prisma.adminAccount.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  if (admin.mfaEnabled) return { mfaRequired: true, challengeToken: createMfaChallenge(admin.id, admin.tokenVersion) };
  return { admin: toPublicAdmin(admin), token: await issueAdminAccessToken(admin, metadata) };
}

export async function verifyAdminMfa(challengeToken: string, code: string, metadata?: SessionMetadata): Promise<{ admin: PublicAdmin; token: string }> {
  const payload = verifyMfaChallenge(challengeToken);
  const admin = await prisma.adminAccount.findFirst({ where: { id: payload.sub, isActive: true } });
  if (!admin || admin.tokenVersion !== payload.tokenVersion || !admin.mfaEnabled || !admin.mfaSecretEncrypted) throw new AppError(401, "MFA challenge is no longer valid", "MFA_CHALLENGE_INVALID");
  const validTotp = verifyTotp(decryptSecret(admin.mfaSecretEncrypted), code);
  const recovery = getRecoveryHashes(admin.mfaRecoveryCodes);
  const consumed = validTotp ? { valid: true, remaining: recovery } : consumeRecoveryCode(code, recovery);
  if (!consumed.valid) throw new AppError(401, "Invalid authenticator code", "MFA_CODE_INVALID");
  if (!validTotp) await prisma.adminAccount.update({ where: { id: admin.id }, data: { mfaRecoveryCodes: consumed.remaining } });
  return { admin: toPublicAdmin(admin), token: await issueAdminAccessToken(admin, metadata) };
}

export async function getPublicAdmin(adminId: string): Promise<PublicAdmin> {
  const admin = await prisma.adminAccount.findFirst({ where: { id: adminId, isActive: true } });
  if (!admin) throw new AppError(401, "Administrator session is no longer valid", "ADMIN_SESSION_INVALID");
  return toPublicAdmin(admin);
}

export async function revokeAdminToken(adminId: string): Promise<void> {
  await prisma.adminAccount.update({ where: { id: adminId }, data: { tokenVersion: { increment: 1 } } });
  await prisma.adminSession.updateMany({ where: { adminId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAdminSession(adminId: string, sessionId: string): Promise<void> { await prisma.adminSession.updateMany({ where: { id: sessionId, adminId, revokedAt: null }, data: { revokedAt: new Date() } }); }
export async function changeAdminPassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> { const admin = await prisma.adminAccount.findFirst({ where: { id: adminId, isActive: true } }); if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) throw new AppError(401, "Current password is incorrect", "CURRENT_PASSWORD_INVALID"); if (currentPassword === newPassword) throw new AppError(400, "New password must be different", "PASSWORD_UNCHANGED"); await prisma.adminAccount.update({ where: { id: adminId }, data: { passwordHash: await bcrypt.hash(newPassword, env.bcryptRounds), tokenVersion: { increment: 1 } } }); await prisma.adminSession.updateMany({ where: { adminId, revokedAt: null }, data: { revokedAt: new Date() } }); }
export async function listAdminSessions(adminId: string, currentSessionId: string) { const sessions = await prisma.adminSession.findMany({ where: { adminId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true, expiresAt: true }, orderBy: { lastUsedAt: "desc" } }); return sessions.map((session) => ({ ...session, current: session.id === currentSessionId })); }

export async function startAdminMfaSetup(adminId: string, email: string): Promise<{ secret: string; otpauthUri: string }> {
  const admin = await prisma.adminAccount.findFirst({ where: { id: adminId, isActive: true } });
  if (!admin) throw new AppError(404, "Administrator not found", "ADMIN_NOT_FOUND");
  if (admin.mfaEnabled) throw new AppError(409, "MFA is already enabled", "MFA_ALREADY_ENABLED");
  const secret = generateTotpSecret();
  await prisma.adminAccount.update({ where: { id: adminId }, data: { mfaPendingSecretEncrypted: encryptSecret(secret) } });
  return { secret, otpauthUri: buildTotpUri(secret, email) };
}

export async function enableAdminMfa(adminId: string, code: string): Promise<string[]> {
  const admin = await prisma.adminAccount.findFirst({ where: { id: adminId, isActive: true } });
  if (!admin?.mfaPendingSecretEncrypted) throw new AppError(400, "Start MFA setup before enabling it", "MFA_SETUP_REQUIRED");
  const secret = decryptSecret(admin.mfaPendingSecretEncrypted);
  if (!verifyTotp(secret, code)) throw new AppError(400, "Invalid authenticator code", "MFA_CODE_INVALID");
  const recoveryCodes = generateRecoveryCodes();
  await prisma.adminAccount.update({ where: { id: adminId }, data: { mfaEnabled: true, mfaSecretEncrypted: encryptSecret(secret), mfaPendingSecretEncrypted: null, mfaRecoveryCodes: recoveryCodes.map(hashRecoveryCode) } });
  return recoveryCodes;
}

export async function disableAdminMfa(adminId: string, code: string): Promise<void> {
  const admin = await prisma.adminAccount.findFirst({ where: { id: adminId, isActive: true } });
  if (!admin?.mfaEnabled || !admin.mfaSecretEncrypted) throw new AppError(400, "MFA is not enabled", "MFA_NOT_ENABLED");
  const validTotp = verifyTotp(decryptSecret(admin.mfaSecretEncrypted), code);
  const consumed = validTotp ? { valid: true, remaining: getRecoveryHashes(admin.mfaRecoveryCodes) } : consumeRecoveryCode(code, getRecoveryHashes(admin.mfaRecoveryCodes));
  if (!consumed.valid) throw new AppError(401, "Invalid authenticator code", "MFA_CODE_INVALID");
  await prisma.adminAccount.update({ where: { id: adminId }, data: { mfaEnabled: false, mfaSecretEncrypted: null, mfaPendingSecretEncrypted: null, mfaRecoveryCodes: Prisma.JsonNull, tokenVersion: { increment: 1 } } });
  await prisma.adminSession.updateMany({ where: { adminId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function verifyAdminAccessToken(token: string): Promise<AdminAuthContext> {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & { tokenType?: string; tokenVersion?: number; sessionId?: string };
    if (payload.tokenType !== "admin" || !payload.sub || payload.tokenVersion === undefined || !payload.sessionId) throw new Error("Invalid admin token claims");
    const admin = await prisma.adminAccount.findFirst({ where: { id: payload.sub, isActive: true } });
    const session = await prisma.adminSession.findFirst({ where: { id: payload.sessionId, adminId: payload.sub, tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!admin || !session || admin.tokenVersion !== payload.tokenVersion) throw new Error("Admin session revoked");
    await prisma.adminSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    return { adminId: admin.id, tokenVersion: admin.tokenVersion, sessionId: session.id };
  } catch {
    throw new AppError(401, "Invalid or expired administrator session", "ADMIN_SESSION_INVALID");
  }
}

async function issueAdminAccessToken(admin: { id: string; tokenVersion: number }, metadata?: SessionMetadata): Promise<string> {
  const sessionId = crypto.randomUUID();
  const token = jwt.sign({ tokenType: "admin", tokenVersion: admin.tokenVersion, sessionId }, env.jwtSecret, { subject: admin.id, expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
  await prisma.adminSession.create({ data: { id: sessionId, adminId: admin.id, tokenHash: hashToken(token), userAgent: metadata?.userAgent, ipAddress: metadata?.ipAddress, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  return token;
}

function createMfaChallenge(accountId: string, tokenVersion: number): string { return jwt.sign({ tokenType: "mfa", accountType: "admin", tokenVersion }, env.jwtSecret, { subject: accountId, expiresIn: "5m" }); }
function verifyMfaChallenge(token: string): jwt.JwtPayload & { sub: string; tokenVersion: number } { try { const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & { tokenType?: string; accountType?: string; tokenVersion?: number }; if (payload.tokenType !== "mfa" || payload.accountType !== "admin" || !payload.sub || payload.tokenVersion === undefined) throw new Error("Invalid MFA challenge"); return payload as jwt.JwtPayload & { sub: string; tokenVersion: number }; } catch { throw new AppError(401, "MFA challenge is invalid or expired", "MFA_CHALLENGE_INVALID"); } }
function hashToken(token: string): string { return crypto.createHash("sha256").update(token).digest("hex"); }
function getRecoveryHashes(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

function toPublicAdmin(admin: { id: string; email: string; name: string; mfaEnabled: boolean }): PublicAdmin {
  return { id: admin.id, email: admin.email, name: admin.name, mfaEnabled: admin.mfaEnabled };
}
