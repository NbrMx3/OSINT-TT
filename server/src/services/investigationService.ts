import { InvestigationCategory, InvestigationStatus, Prisma, RoleName } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import type { CreateInvestigationInput, InvestigationListQuery } from "../types/investigation";
import { enqueueInvestigation } from "./investigationJobService";

const detailInclude = { owner: { select: { id: true, name: true, email: true } }, targets: { orderBy: { createdAt: "asc" as const } }, jobs: { orderBy: { queuedAt: "desc" as const }, take: 10 }, notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" as const } }, activityLogs: { orderBy: { createdAt: "desc" as const }, take: 50 }, _count: { select: { findings: true, entities: true, relationships: true } } } as const;

export async function listInvestigations(tenantId: string, query: InvestigationListQuery) {
  const where: Prisma.InvestigationWhereInput = { tenantId, ...(query.status ? { status: query.status } : {}), ...(query.category ? { category: query.category } : {}), ...(query.search ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }] } : {}) };
  const [items, total] = await prisma.$transaction([prisma.investigation.findMany({ where, include: { owner: { select: { id: true, name: true } }, targets: true, _count: { select: { findings: true, entities: true } } }, orderBy: { updatedAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }), prisma.investigation.count({ where })]);
  return { items, total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) };
}

export async function getInvestigation(id: string, tenantId: string) { const investigation = await prisma.investigation.findFirst({ where: { id, tenantId }, include: detailInclude }); if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND"); return investigation; }

export async function createInvestigation(tenantId: string, ownerId: string, input: CreateInvestigationInput) {
  return prisma.investigation.create({ data: { tenantId, ownerId, name: input.title, description: input.description, category: input.category, selectedModules: input.selectedModules as Prisma.InputJsonValue, targets: { create: input.targets.map((target) => ({ type: target.type, value: target.value, label: target.label })) }, activityLogs: { create: { tenantId, userId: ownerId, action: "INVESTIGATION_CREATED", entityType: "Investigation" } } }, include: detailInclude });
}

export async function updateInvestigation(id: string, tenantId: string, input: Partial<CreateInvestigationInput>) {
  const current = await getInvestigation(id, tenantId);
  if (current.status !== InvestigationStatus.DRAFT && current.status !== InvestigationStatus.FAILED) throw new AppError(409, "Only draft or failed investigations can be edited", "INVESTIGATION_LOCKED");
  return prisma.$transaction(async (transaction) => {
    if (input.targets) await transaction.investigationTarget.deleteMany({ where: { investigationId: id } });
    return transaction.investigation.update({ where: { id }, data: { ...(input.title !== undefined ? { name: input.title } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.category !== undefined ? { category: input.category } : {}), ...(input.selectedModules !== undefined ? { selectedModules: input.selectedModules as Prisma.InputJsonValue } : {}), ...(input.targets ? { targets: { create: input.targets.map((target) => ({ type: target.type, value: target.value, label: target.label })) } } : {}), activityLogs: { create: { tenantId, action: "INVESTIGATION_UPDATED", entityType: "Investigation", entityId: id } } }, include: detailInclude });
  });
}

export async function startInvestigation(id: string, tenantId: string, userId: string) { const current = await getInvestigation(id, tenantId); if (current.status !== InvestigationStatus.DRAFT && current.status !== InvestigationStatus.FAILED) throw new AppError(409, "Investigation cannot be started from its current status", "INVALID_STATUS"); if (!current.targets.length) throw new AppError(400, "Add at least one investigation target before starting", "TARGETS_REQUIRED"); if (current.status === InvestigationStatus.FAILED && current.retryCount >= current.maxRetries) throw new AppError(409, "Maximum retry attempts reached", "RETRY_LIMIT_REACHED"); const attempt = current.retryCount + 1; const job = await prisma.$transaction(async (transaction) => { const created = await transaction.investigationJob.create({ data: { investigationId: id, attempt } }); await transaction.investigation.update({ where: { id }, data: { status: InvestigationStatus.PENDING, progress: 0, retryCount: attempt, failureReason: null, cancelledAt: null } }); await transaction.activityLog.create({ data: { tenantId, userId, investigationId: id, action: attempt > 1 ? "INVESTIGATION_RETRY_REQUESTED" : "INVESTIGATION_QUEUED", entityType: "Investigation", entityId: id, metadata: { attempt } } }); return created; }); enqueueInvestigation(job.id); return job; }

export async function cancelInvestigation(id: string, tenantId: string, userId: string) { const current = await getInvestigation(id, tenantId); if (current.status !== InvestigationStatus.PENDING && current.status !== InvestigationStatus.RUNNING) throw new AppError(409, "Only pending or running investigations can be cancelled", "INVALID_STATUS"); const job = current.jobs.find((candidate) => ["QUEUED", "RUNNING"].includes(candidate.status)); await prisma.$transaction(async (transaction) => { if (job) await transaction.investigationJob.update({ where: { id: job.id }, data: { status: "CANCELLED", currentStage: "Cancelled by analyst", cancelledAt: new Date() } }); await transaction.investigation.update({ where: { id }, data: { status: InvestigationStatus.FAILED, failureReason: "Cancelled by analyst", cancelledAt: new Date() } }); await transaction.activityLog.create({ data: { tenantId, userId, investigationId: id, action: "INVESTIGATION_CANCELLED", entityType: "Investigation", entityId: id } }); }); }

export async function archiveInvestigation(id: string, tenantId: string, userId: string) { await getInvestigation(id, tenantId); return prisma.investigation.update({ where: { id }, data: { status: InvestigationStatus.ARCHIVED, activityLogs: { create: { tenantId, userId, action: "INVESTIGATION_ARCHIVED", entityType: "Investigation", entityId: id } } }, include: detailInclude }); }

export async function deleteInvestigation(id: string, tenantId: string, userId: string, role: RoleName) { const current = await getInvestigation(id, tenantId); if (current.ownerId !== userId && role !== RoleName.ADMINISTRATOR) throw new AppError(403, "Only the investigation owner or an administrator can delete it", "FORBIDDEN"); await prisma.investigation.delete({ where: { id } }); }

export async function addAnalystNote(id: string, tenantId: string, authorId: string, content: string) { await getInvestigation(id, tenantId); return prisma.analystNote.create({ data: { tenantId, investigationId: id, authorId, content } }); }
export async function getInvestigationHistory(id: string, tenantId: string) { await getInvestigation(id, tenantId); return prisma.activityLog.findMany({ where: { investigationId: id, tenantId }, orderBy: { createdAt: "desc" } }); }
export async function getInvestigationResults(id: string, tenantId: string) { const investigation = await getInvestigation(id, tenantId); const findings = await prisma.finding.findMany({ where: { investigationId: id, tenantId }, orderBy: { createdAt: "desc" } }); return { results: investigation.results, findings }; }
