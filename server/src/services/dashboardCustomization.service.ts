import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";

export async function listSavedDashboards(tenantId: string, userId: string) {
  return prisma.savedDashboard.findMany({ where: { tenantId, userId }, orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }] });
}
export async function createSavedDashboard(tenantId: string, userId: string, input: { name: string; layout: unknown[]; filters?: Record<string, unknown>; isPinned?: boolean }) {
  return prisma.savedDashboard.create({ data: { tenantId, userId, name: input.name, layout: input.layout as Prisma.InputJsonValue, filters: input.filters as Prisma.InputJsonValue | undefined, isPinned: input.isPinned ?? false } });
}
export async function updateSavedDashboard(id: string, tenantId: string, userId: string, input: { name?: string; layout?: unknown[]; filters?: Record<string, unknown>; isPinned?: boolean }) {
  const existing = await prisma.savedDashboard.findFirst({ where: { id, tenantId, userId } });
  if (!existing) throw new AppError(404, "Saved dashboard not found", "SAVED_DASHBOARD_NOT_FOUND");
  return prisma.savedDashboard.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.layout !== undefined ? { layout: input.layout as Prisma.InputJsonValue } : {}), ...(input.filters !== undefined ? { filters: input.filters as Prisma.InputJsonValue } : {}), ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}) } });
}
export async function deleteSavedDashboard(id: string, tenantId: string, userId: string) {
  const existing = await prisma.savedDashboard.findFirst({ where: { id, tenantId, userId } });
  if (!existing) throw new AppError(404, "Saved dashboard not found", "SAVED_DASHBOARD_NOT_FOUND");
  await prisma.savedDashboard.delete({ where: { id } });
}
