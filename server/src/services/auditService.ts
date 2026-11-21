import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export type AuditInput = {
  tenantId?: string;
  userId?: string;
  investigationId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.JsonValue;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt?: Date;
};

export async function appendAuditLog(input: AuditInput): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await appendAuditLogInTransaction(transaction, input);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function appendAuditLogInTransaction(transaction: Prisma.TransactionClient, input: AuditInput): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('osint-audit-chain'))`;
  const latest = await transaction.activityLog.findFirst({
    where: { chainIndex: { not: null } },
    orderBy: { chainIndex: "desc" },
    select: { chainIndex: true, integrityHash: true },
  });
  const chainIndex = (latest?.chainIndex ?? 0) + 1;
  const previousHash = latest?.integrityHash ?? "GENESIS";
  const createdAt = input.createdAt ?? new Date();
  const payload = {
    chainIndex,
    previousHash,
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    investigationId: input.investigationId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    requestId: input.requestId ?? null,
    createdAt: createdAt.toISOString(),
  };
  const integrityHash = crypto.createHash("sha256").update(canonicalStringify(payload)).digest("hex");

  await transaction.activityLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      investigationId: input.investigationId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata == null ? Prisma.DbNull : input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      chainIndex,
      previousHash,
      integrityHash,
      createdAt,
    },
  });
}

export async function verifyAuditChain(): Promise<{ valid: boolean; entries: number; firstInvalidIndex: number | null }> {
  const entries = await prisma.activityLog.findMany({
    where: { chainIndex: { not: null } },
    orderBy: { chainIndex: "asc" },
  });
  let previousHash = "GENESIS";
  for (const entry of entries) {
    const payload = {
      chainIndex: entry.chainIndex,
      previousHash,
      tenantId: entry.tenantId ?? null,
      userId: entry.userId ?? null,
      investigationId: entry.investigationId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
      createdAt: entry.createdAt.toISOString(),
    };
    const expected = crypto.createHash("sha256").update(canonicalStringify(payload)).digest("hex");
    if (entry.previousHash !== previousHash || entry.integrityHash !== expected) {
      return { valid: false, entries: entries.length, firstInvalidIndex: entry.chainIndex };
    }
    previousHash = entry.integrityHash ?? "";
  }
  return { valid: true, entries: entries.length, firstInvalidIndex: null };
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
