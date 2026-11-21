import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { RoleName } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/appError";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export async function createInvitation(input: { tenantId: string; invitedById: string; email: string; role: RoleName }) {
  const email = input.email.trim().toLowerCase();
  const [existingUser, role] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.role.findUnique({ where: { name: input.role }, select: { id: true, name: true } }),
  ]);
  if (existingUser) throw new AppError(409, "An account with this email already exists", "EMAIL_EXISTS");
  if (!role) throw new AppError(400, "Selected role is not available", "ROLE_INVALID");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const invitation = await prisma.userInvitation.create({ data: { tenantId: input.tenantId, roleId: role.id, invitedById: input.invitedById, email, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + invitationLifetimeMs) }, select: { id: true, email: true, expiresAt: true, createdAt: true, role: { select: { name: true } } } });
  await prisma.activityLog.create({ data: { tenantId: input.tenantId, userId: input.invitedById, action: "AUTH_INVITATION_CREATED", entityType: "UserInvitation", entityId: invitation.id, metadata: { email, role: role.name } } });
  return { ...invitation, token: rawToken, inviteUrl: `${env.clientOrigins[0]}/invite/${rawToken}` };
}

export async function listInvitations(tenantId: string) {
  return prisma.userInvitation.findMany({ where: { tenantId }, select: { id: true, email: true, expiresAt: true, acceptedAt: true, createdAt: true, role: { select: { name: true } }, invitedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function revokeInvitation(tenantId: string, id: string): Promise<void> {
  const result = await prisma.userInvitation.deleteMany({ where: { id, tenantId, acceptedAt: null } });
  if (!result.count) throw new AppError(404, "Invitation not found or already accepted", "INVITATION_NOT_FOUND");
}

export async function acceptInvitation(input: { token: string; name: string; password: string }) {
  const invitation = await prisma.userInvitation.findFirst({ where: { tokenHash: hashToken(input.token), acceptedAt: null, expiresAt: { gt: new Date() } }, include: { role: true } });
  if (!invitation) throw new AppError(400, "Invitation is invalid or expired", "INVITATION_INVALID");
  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existingUser) throw new AppError(409, "An account with this email already exists", "EMAIL_EXISTS");
  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const user = await prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({ data: { tenantId: invitation.tenantId, roleId: invitation.roleId, name: input.name.trim(), email: invitation.email, passwordHash }, select: { id: true, tenantId: true, email: true, name: true, mfaEnabled: true, role: { select: { name: true, permissions: { select: { permission: { select: { code: true } } } } } } } });
    await transaction.userInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    await transaction.activityLog.create({ data: { tenantId: invitation.tenantId, userId: created.id, action: "AUTH_INVITATION_ACCEPTED", entityType: "User", entityId: created.id } });
    return created;
  });
  return user;
}

function hashToken(token: string): string { return crypto.createHash("sha256").update(token).digest("hex"); }
