import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { verifyAuditChain } from "../services/auditService";

export async function listTenantUsers(request: Request, response: Response): Promise<void> {
  const users = await prisma.user.findMany({ where: { tenantId: request.auth?.tenantId }, select: { id: true, name: true, email: true, isActive: true, createdAt: true, role: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  response.json({ users });
}

export async function getAdminDashboard(_request: Request, response: Response): Promise<void> {
  const [users, activeUsers, tenants, investigations, activityLogs, recentActivity, statusGroups, recentUsers, recentTenants] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.tenant.count(),
    prisma.investigation.count(),
    prisma.activityLog.count(),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: { select: { name: true, email: true } }, tenant: { select: { name: true, slug: true } }, investigation: { select: { id: true, name: true } } } }),
    prisma.investigation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, email: true, isActive: true, createdAt: true, tenant: { select: { name: true } }, role: { select: { name: true } } } }),
    prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, slug: true, createdAt: true, _count: { select: { users: true, investigations: true } } } }),
  ]);
  response.json({ metrics: { users, activeUsers, tenants, investigations, activityLogs }, investigationStatuses: statusGroups.map((group) => ({ status: group.status, count: group._count._all })), recentActivity, recentUsers, recentTenants });
}

export async function listAdminActivityLogs(request: Request, response: Response): Promise<void> {
  const page = positiveInteger(request.query.page, 1);
  const pageSize = Math.min(100, positiveInteger(request.query.pageSize, 50));
  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const where = search ? { OR: [{ action: { contains: search, mode: "insensitive" as const } }, { entityType: { contains: search, mode: "insensitive" as const } }, { entityId: { contains: search, mode: "insensitive" as const } }] } : undefined;
  const [total, items] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { user: { select: { name: true, email: true } }, tenant: { select: { name: true, slug: true } }, investigation: { select: { id: true, name: true } } } }),
  ]);
  response.json({ items, page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) });
}

export async function verifyAdminActivityLogs(_request: Request, response: Response): Promise<void> {
  response.json(await verifyAuditChain());
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
