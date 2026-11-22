import { InvestigationCategory, InvestigationPriority, InvestigationStatus, Prisma, RoleName, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import type { CreateInvestigationInput, InvestigationListQuery } from "../types/investigation";
import { enqueueInvestigation } from "./investigationJobService";
import { createHash } from "node:crypto";

const detailInclude = { owner: { select: { id: true, name: true, email: true } }, assignee: { select: { id: true, name: true, email: true } }, targets: { orderBy: { createdAt: "asc" as const } }, jobs: { orderBy: { queuedAt: "desc" as const }, take: 10 }, tasks: { include: { assignee: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" as const } }, notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" as const } }, activityLogs: { orderBy: { createdAt: "desc" as const }, take: 50 }, _count: { select: { findings: true, entities: true, relationships: true, tasks: true } } } as const;

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

export async function addAnalystNote(id: string, tenantId: string, authorId: string, content: string, mentions: string[] = []) { await getInvestigation(id, tenantId); return prisma.$transaction(async (transaction) => { const note = await transaction.analystNote.create({ data: { tenantId, investigationId: id, authorId, content, mentions: mentions as Prisma.InputJsonValue } }); await transaction.activityLog.create({ data: { tenantId, userId: authorId, investigationId: id, action: "INVESTIGATION_COMMENT_ADDED", entityType: "AnalystNote", entityId: note.id, metadata: { mentions } } }); return note; }); }
export async function getInvestigationHistory(id: string, tenantId: string) { await getInvestigation(id, tenantId); return prisma.activityLog.findMany({ where: { investigationId: id, tenantId }, orderBy: { createdAt: "desc" } }); }
export async function getInvestigationResults(id: string, tenantId: string) { const investigation = await getInvestigation(id, tenantId); const findings = await prisma.finding.findMany({ where: { investigationId: id, tenantId }, include: { evidence: { orderBy: { collectedAt: "desc" } } }, orderBy: { createdAt: "desc" } }); return { results: investigation.results, findings }; }

export async function getInvestigationEvidence(id: string, tenantId: string) { await getInvestigation(id, tenantId); return prisma.evidence.findMany({ where: { investigationId: id, tenantId }, include: { finding: { select: { id: true, title: true } } }, orderBy: { collectedAt: "desc" } }); }

export async function createInvestigationEvidence(id: string, tenantId: string, userId: string, input: { sourceUrl?: string; title: string; capturedAt?: string; findingId?: string; content?: string; screenshots?: string[]; attachments?: Array<{ name: string; url?: string; sha256?: string }>; provenance?: Record<string, unknown>; }) {
  await getInvestigation(id, tenantId);
  if (input.findingId) {
    const finding = await prisma.finding.findFirst({ where: { id: input.findingId, investigationId: id, tenantId } });
    if (!finding) throw new AppError(404, "Finding not found in this investigation", "FINDING_NOT_FOUND");
  }
  const capturedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();
  const contentHash = input.content ? createHash("sha256").update(input.content).digest("hex") : undefined;
  const custodyEntry = { action: "COLLECTED", actorId: userId, timestamp: new Date().toISOString(), note: "Evidence captured and stored in the evidence vault" };
  return prisma.evidence.create({ data: { tenantId, investigationId: id, findingId: input.findingId, sourceUrl: input.sourceUrl, title: input.title, contentHash, collectedAt: capturedAt, screenshots: input.screenshots as Prisma.InputJsonValue | undefined, attachments: input.attachments as Prisma.InputJsonValue | undefined, provenance: input.provenance as Prisma.InputJsonValue | undefined, chainOfCustody: [custodyEntry] as Prisma.InputJsonValue, metadata: { createdById: userId } as Prisma.InputJsonValue } });
}

export async function updateInvestigationCollaboration(id: string, tenantId: string, userId: string, input: { status?: InvestigationStatus; priority?: InvestigationPriority; assigneeId?: string | null; deadline?: string | null }) {
  await getInvestigation(id, tenantId);
  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({ where: { id: input.assigneeId, tenantId, isActive: true } });
    if (!assignee) throw new AppError(404, "Assignee not found in this tenant", "ASSIGNEE_NOT_FOUND");
  }
  const updated = await prisma.investigation.update({ where: { id }, data: { ...(input.status ? { status: input.status } : {}), ...(input.priority ? { priority: input.priority } : {}), ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}), ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}) }, include: detailInclude });
  await prisma.activityLog.create({ data: { tenantId, userId, investigationId: id, action: "INVESTIGATION_COLLABORATION_UPDATED", entityType: "Investigation", entityId: id, metadata: input as Prisma.InputJsonValue } });
  return updated;
}

export async function listInvestigationCollaborators(tenantId: string) { return prisma.user.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }); }

export async function createInvestigationTask(id: string, tenantId: string, userId: string, input: { title: string; description?: string; status?: TaskStatus; priority?: InvestigationPriority; assigneeId?: string; dueAt?: string }) {
  await getInvestigation(id, tenantId);
  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({ where: { id: input.assigneeId, tenantId, isActive: true } });
    if (!assignee) throw new AppError(404, "Assignee not found in this tenant", "ASSIGNEE_NOT_FOUND");
  }
  const task = await prisma.investigationTask.create({ data: { tenantId, investigationId: id, title: input.title, description: input.description, status: input.status ?? TaskStatus.TODO, priority: input.priority ?? InvestigationPriority.MEDIUM, assigneeId: input.assigneeId, createdById: userId, dueAt: input.dueAt ? new Date(input.dueAt) : null, completedAt: input.status === TaskStatus.COMPLETED ? new Date() : null }, include: { assignee: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true } } } });
  await prisma.activityLog.create({ data: { tenantId, userId, investigationId: id, action: "INVESTIGATION_TASK_CREATED", entityType: "InvestigationTask", entityId: task.id, metadata: { title: task.title, assigneeId: task.assigneeId } } });
  return task;
}

export async function updateInvestigationTask(id: string, taskId: string, tenantId: string, userId: string, input: { title?: string; description?: string; status?: TaskStatus; priority?: InvestigationPriority; assigneeId?: string | null; dueAt?: string | null }) {
  await getInvestigation(id, tenantId);
  const existing = await prisma.investigationTask.findFirst({ where: { id: taskId, investigationId: id, tenantId } });
  if (!existing) throw new AppError(404, "Task not found", "TASK_NOT_FOUND");
  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({ where: { id: input.assigneeId, tenantId, isActive: true } });
    if (!assignee) throw new AppError(404, "Assignee not found in this tenant", "ASSIGNEE_NOT_FOUND");
  }
  const task = await prisma.investigationTask.update({ where: { id: taskId }, data: { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.status !== undefined ? { status: input.status, completedAt: input.status === TaskStatus.COMPLETED ? new Date() : null } : {}), ...(input.priority !== undefined ? { priority: input.priority } : {}), ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}), ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}) }, include: { assignee: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true } } } });
  await prisma.activityLog.create({ data: { tenantId, userId, investigationId: id, action: "INVESTIGATION_TASK_UPDATED", entityType: "InvestigationTask", entityId: taskId, metadata: input as Prisma.InputJsonValue } });
  return task;
}

export async function appendEvidenceCustody(id: string, evidenceId: string, tenantId: string, userId: string, input: { action: string; note?: string }) {
  await getInvestigation(id, tenantId);
  const evidence = await prisma.evidence.findFirst({ where: { id: evidenceId, investigationId: id, tenantId } });
  if (!evidence) throw new AppError(404, "Evidence not found", "EVIDENCE_NOT_FOUND");
  const existing = Array.isArray(evidence.chainOfCustody) ? evidence.chainOfCustody : [];
  const entry = { action: input.action, actorId: userId, timestamp: new Date().toISOString(), note: input.note ?? null };
  return prisma.evidence.update({ where: { id: evidenceId }, data: { chainOfCustody: [...existing, entry] as Prisma.InputJsonValue } });
}
