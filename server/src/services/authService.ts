import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Prisma, RoleName } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import type { AuthContext, PublicUser } from "../types/auth";
import { buildTotpUri, consumeRecoveryCode, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, verifyTotp } from "../utils/mfa";
import { decryptSecret, encryptSecret } from "../utils/secretCrypto";
import { appendAuditLog } from "./auditService";

const publicUserInclude = { role: { select: { name: true, permissions: { select: { permission: { select: { code: true } } } } } } } as const;
export const authCookieName = "osintx_token";
export const authCookieOptions = { httpOnly: true, sameSite: env.nodeEnv === "production" ? "strict" as const : "lax" as const, secure: env.nodeEnv === "production", path: "/" };

type SessionMetadata = { userAgent?: string; ipAddress?: string };
export type AuthLoginResult = { user: PublicUser; token: string } | { mfaRequired: true; challengeToken: string };

export async function registerUser(input: { name: string; email: string; password: string; organizationName?: string }, metadata?: SessionMetadata): Promise<{ user: PublicUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, "An account with this email already exists", "EMAIL_EXISTS");
  const role = await prisma.role.findUnique({ where: { name: RoleName.ANALYST } });
  if (!role) throw new AppError(500, "Default analyst role is not configured", "ROLE_NOT_CONFIGURED");
  const tenantName = input.organizationName?.trim() || `${input.name.trim()}'s workspace`;
  const tenant = await prisma.tenant.create({ data: { name: tenantName, slug: `${slugify(tenantName)}-${crypto.randomBytes(4).toString("hex")}` } });
  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const user = await prisma.user.create({ data: { tenantId: tenant.id, roleId: role.id, name: input.name.trim(), email: input.email.toLowerCase(), passwordHash }, include: publicUserInclude });
  await recordAudit({ tenantId: tenant.id, userId: user.id, action: "AUTH_REGISTERED", entityType: "User", entityId: user.id });
  return { user: toPublicUser(user), token: await issueAccessToken(user, metadata) };
}

export async function loginUser(input: { email: string; password: string }, metadata?: SessionMetadata): Promise<AuthLoginResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, include: publicUserInclude });
  if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({ tenantId: user.tenantId, userId: user.id, action: "AUTH_LOGIN", entityType: "User", entityId: user.id });
  if (user.mfaEnabled) return { mfaRequired: true, challengeToken: createMfaChallenge("user", user.id, user.tokenVersion) };
  return { user: toPublicUser(user), token: await issueAccessToken(user, metadata) };
}

export async function verifyUserMfa(challengeToken: string, code: string, metadata?: SessionMetadata): Promise<{ user: PublicUser; token: string }> {
  const payload = verifyMfaChallenge(challengeToken, "user");
  const user = await prisma.user.findFirst({ where: { id: payload.sub, isActive: true }, include: publicUserInclude });
  if (!user || user.tokenVersion !== payload.tokenVersion || !user.mfaEnabled || !user.mfaSecretEncrypted) throw new AppError(401, "MFA challenge is no longer valid", "MFA_CHALLENGE_INVALID");
  const validTotp = verifyTotp(decryptSecret(user.mfaSecretEncrypted), code);
  const recovery = getRecoveryHashes(user.mfaRecoveryCodes);
  const consumed = validTotp ? { valid: true, remaining: recovery } : consumeRecoveryCode(code, recovery);
  if (!consumed.valid) throw new AppError(401, "Invalid authenticator code", "MFA_CODE_INVALID");
  if (!validTotp) await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryCodes: consumed.remaining } });
  return { user: toPublicUser(user), token: await issueAccessToken(user, metadata) };
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
  await prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await recordAudit({ tenantId, userId, action: "AUTH_LOGOUT", entityType: "User", entityId: userId });
}

export async function revokeUserSession(userId: string, sessionId: string, tenantId: string): Promise<void> {
  await prisma.userSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await recordAudit({ tenantId, userId, action: "AUTH_SESSION_REVOKED", entityType: "UserSession", entityId: sessionId });
}

export async function changeUserPassword(userId: string, tenantId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, isActive: true } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(401, "Current password is incorrect", "CURRENT_PASSWORD_INVALID");
  if (currentPassword === newPassword) throw new AppError(400, "New password must be different", "PASSWORD_UNCHANGED");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, env.bcryptRounds), tokenVersion: { increment: 1 } } });
  await prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await recordAudit({ tenantId, userId, action: "AUTH_PASSWORD_CHANGED", entityType: "User", entityId: userId });
}

export async function listUserSessions(userId: string, currentSessionId: string) {
  return prisma.userSession.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true, expiresAt: true }, orderBy: { lastUsedAt: "desc" } }).then((sessions) => sessions.map((session) => ({ ...session, current: session.id === currentSessionId })));
}

export async function startUserMfaSetup(userId: string, tenantId: string, email: string): Promise<{ secret: string; otpauthUri: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, isActive: true } });
  if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
  if (user.mfaEnabled) throw new AppError(409, "MFA is already enabled", "MFA_ALREADY_ENABLED");
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { mfaPendingSecretEncrypted: encryptSecret(secret) } });
  return { secret, otpauthUri: buildTotpUri(secret, email) };
}

export async function enableUserMfa(userId: string, tenantId: string, code: string): Promise<string[]> {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, isActive: true } });
  if (!user?.mfaPendingSecretEncrypted) throw new AppError(400, "Start MFA setup before enabling it", "MFA_SETUP_REQUIRED");
  const secret = decryptSecret(user.mfaPendingSecretEncrypted);
  if (!verifyTotp(secret, code)) throw new AppError(400, "Invalid authenticator code", "MFA_CODE_INVALID");
  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaSecretEncrypted: encryptSecret(secret), mfaPendingSecretEncrypted: null, mfaRecoveryCodes: recoveryCodes.map(hashRecoveryCode) } });
  await recordAudit({ tenantId, userId, action: "AUTH_MFA_ENABLED", entityType: "User", entityId: userId });
  return recoveryCodes;
}

export async function disableUserMfa(userId: string, tenantId: string, code: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, isActive: true } });
  if (!user?.mfaEnabled || !user.mfaSecretEncrypted) throw new AppError(400, "MFA is not enabled", "MFA_NOT_ENABLED");
  const validTotp = verifyTotp(decryptSecret(user.mfaSecretEncrypted), code);
  const consumed = validTotp ? { valid: true, remaining: getRecoveryHashes(user.mfaRecoveryCodes) } : consumeRecoveryCode(code, getRecoveryHashes(user.mfaRecoveryCodes));
  if (!consumed.valid) throw new AppError(401, "Invalid authenticator code", "MFA_CODE_INVALID");
  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecretEncrypted: null, mfaPendingSecretEncrypted: null, mfaRecoveryCodes: Prisma.JsonNull, tokenVersion: { increment: 1 } } });
  await prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await recordAudit({ tenantId, userId, action: "AUTH_MFA_DISABLED", entityType: "User", entityId: userId });
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
  await recordAudit({ tenantId: user.tenantId, userId: user.id, action: "AUTH_PASSWORD_RESET", entityType: "User", entityId: user.id });
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & { tenantId?: string; role?: RoleName; tokenVersion?: number; sessionId?: string };
    if (!payload.sub || !payload.tenantId || !payload.role || payload.tokenVersion === undefined || !payload.sessionId) throw new Error("Invalid token claims");
    const user = await prisma.user.findFirst({ where: { id: payload.sub, tenantId: payload.tenantId, isActive: true }, include: publicUserInclude });
    const session = await prisma.userSession.findFirst({ where: { id: payload.sessionId, userId: payload.sub, tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!user || !session || user.tokenVersion !== payload.tokenVersion || user.role.name !== payload.role) throw new Error("Session revoked");
    await prisma.userSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    return { userId: user.id, tenantId: user.tenantId, role: user.role.name, tokenVersion: user.tokenVersion, sessionId: session.id, permissions: user.role.permissions.map((item) => item.permission.code) };
  } catch {
    throw new AppError(401, "Invalid or expired session", "SESSION_INVALID");
  }
}

async function issueAccessToken(user: { id: string; tenantId: string; tokenVersion: number; role: { name: RoleName } }, metadata?: SessionMetadata): Promise<string> {
  const sessionId = crypto.randomUUID();
  const token = jwt.sign({ tenantId: user.tenantId, role: user.role.name, tokenVersion: user.tokenVersion, sessionId }, env.jwtSecret, { subject: user.id, expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
  await prisma.userSession.create({ data: { id: sessionId, userId: user.id, tokenHash: hashToken(token), userAgent: metadata?.userAgent, ipAddress: metadata?.ipAddress, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  return token;
}

function createMfaChallenge(accountType: "user", accountId: string, tokenVersion: number): string { return jwt.sign({ tokenType: "mfa", accountType, tokenVersion }, env.jwtSecret, { subject: accountId, expiresIn: "5m" }); }
function verifyMfaChallenge(token: string, accountType: "user"): jwt.JwtPayload & { sub: string; tokenVersion: number } { try { const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload & { tokenType?: string; accountType?: string; tokenVersion?: number }; if (payload.tokenType !== "mfa" || payload.accountType !== accountType || !payload.sub || payload.tokenVersion === undefined) throw new Error("Invalid MFA challenge"); return payload as jwt.JwtPayload & { sub: string; tokenVersion: number }; } catch { throw new AppError(401, "MFA challenge is invalid or expired", "MFA_CHALLENGE_INVALID"); } }
function toPublicUser(user: { id: string; tenantId: string; email: string; name: string; mfaEnabled: boolean; role: { name: RoleName; permissions: { permission: { code: string } }[] } }): PublicUser { return { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, role: user.role.name, mfaEnabled: user.mfaEnabled, permissions: user.role.permissions.map((item) => item.permission.code) }; }
function hashToken(token: string): string { return crypto.createHash("sha256").update(token).digest("hex"); }
function getRecoveryHashes(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function slugify(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "workspace"; }

async function recordAudit(input: { tenantId: string; userId: string; action: string; entityType: string; entityId: string }): Promise<void> {
  await appendAuditLog(input);
}
