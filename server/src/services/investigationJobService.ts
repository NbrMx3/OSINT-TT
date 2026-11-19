import { JobStatus, InvestigationStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

const activeJobs = new Set<string>();

export function enqueueInvestigation(jobId: string): void {
  if (activeJobs.has(jobId)) return;
  activeJobs.add(jobId);
  void processInvestigation(jobId).finally(() => activeJobs.delete(jobId));
}

async function processInvestigation(jobId: string): Promise<void> {
  const job = await prisma.investigationJob.findUnique({ where: { id: jobId }, include: { investigation: { include: { targets: true } } } });
  if (!job || job.status !== JobStatus.QUEUED) return;
  const modules = readStringArray(job.investigation.selectedModules);
  const stages = modules.length ? modules : ["Preparation"];
  try {
    await prisma.$transaction([
      prisma.investigationJob.update({ where: { id: jobId }, data: { status: JobStatus.RUNNING, progress: 5, currentStage: "Initializing", startedAt: new Date() } }),
      prisma.investigation.update({ where: { id: job.investigationId }, data: { status: InvestigationStatus.RUNNING, progress: 5, startedAt: new Date(), failureReason: null, cancelledAt: null } }),
      prisma.activityLog.create({ data: { tenantId: job.investigation.tenantId, userId: job.investigation.ownerId, investigationId: job.investigationId, action: "INVESTIGATION_STARTED", entityType: "Investigation", entityId: job.investigationId } }),
    ]);
    for (const [index, stage] of stages.entries()) {
      await delay(180);
      const current = await prisma.investigationJob.findUnique({ where: { id: jobId }, select: { status: true } });
      if (!current || current.status === JobStatus.CANCELLED) return;
      const progress = Math.min(90, 10 + Math.round(((index + 1) / stages.length) * 80));
      await prisma.$transaction([
        prisma.investigationJob.update({ where: { id: jobId }, data: { progress, currentStage: stage } }),
        prisma.investigation.update({ where: { id: job.investigationId }, data: { progress } }),
      ]);
    }
    const results = { execution: "completed", findingsCreated: 0, targetsReceived: job.investigation.targets.length, modulesRequested: modules, note: "No intelligence findings were generated. Findings are created only by configured collection modules." } satisfies Prisma.InputJsonObject;
    await prisma.$transaction([
      prisma.investigationJob.update({ where: { id: jobId }, data: { status: JobStatus.COMPLETED, progress: 100, currentStage: "Complete", completedAt: new Date() } }),
      prisma.investigation.update({ where: { id: job.investigationId }, data: { status: InvestigationStatus.COMPLETED, progress: 100, completedAt: new Date(), results } }),
      prisma.activityLog.create({ data: { tenantId: job.investigation.tenantId, userId: job.investigation.ownerId, investigationId: job.investigationId, action: "INVESTIGATION_COMPLETED", entityType: "Investigation", entityId: job.investigationId, metadata: results } }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Investigation job failed";
    await prisma.$transaction([
      prisma.investigationJob.update({ where: { id: jobId }, data: { status: JobStatus.FAILED, errorMessage: message, completedAt: new Date() } }),
      prisma.investigation.update({ where: { id: job.investigationId }, data: { status: InvestigationStatus.FAILED, failureReason: message } }),
      prisma.activityLog.create({ data: { tenantId: job.investigation.tenantId, userId: job.investigation.ownerId, investigationId: job.investigationId, action: "INVESTIGATION_FAILED", entityType: "Investigation", entityId: job.investigationId, metadata: { message } } }),
    ]).catch(() => undefined);
  }
}

function readStringArray(value: Prisma.JsonValue | null): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function delay(milliseconds: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
