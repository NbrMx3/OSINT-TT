import { JobStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { verifyDatabaseConnection } from "../config/database";

function record(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }

export async function getSystemHealth(tenantId: string) {
  let database: "connected" | "degraded" = "connected";
  try { await verifyDatabaseConnection(); } catch { database = "degraded"; }

  const [providers, queuedJobs, runningJobs, failedJobs, recentRequests, recentActivity] = await Promise.all([
    prisma.intelligenceSource.findMany({ where: { tenantId }, select: { id: true, name: true, type: true, status: true, lastSyncAt: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
    prisma.investigationJob.count({ where: { investigation: { tenantId }, status: JobStatus.QUEUED } }),
    prisma.investigationJob.count({ where: { investigation: { tenantId }, status: JobStatus.RUNNING } }),
    prisma.investigationJob.findMany({ where: { investigation: { tenantId }, status: JobStatus.FAILED }, select: { id: true, investigationId: true, errorMessage: true, completedAt: true }, orderBy: { completedAt: "desc" }, take: 25 }),
    prisma.activityLog.findMany({ where: { tenantId, entityType: "APIRequest", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, select: { metadata: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1000 }),
    prisma.activityLog.findMany({ where: { tenantId }, select: { id: true, action: true, metadata: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const durations: number[] = [];
  const errorBuckets = new Map<string, number>();
  let rateLimitUsed = 0;
  let rateLimitLimit = 0;
  let rateLimitRemaining = 0;
  for (let i = 0; i < 24; i++) {
    const date = new Date(Date.now() - i * 60 * 60 * 1000);
    errorBuckets.set(date.toISOString().slice(0, 13), 0);
  }
  for (const request of recentRequests) {
    const metadata = record(request.metadata);
    if (typeof metadata.durationMs === "number") durations.push(metadata.durationMs);
    if (metadata.outcome === "failure") {
      const key = request.createdAt.toISOString().slice(0, 13);
      errorBuckets.set(key, (errorBuckets.get(key) ?? 0) + 1);
    }
    const rateLimit = record(metadata.rateLimit);
    if (typeof rateLimit.used === "number") rateLimitUsed = Math.max(rateLimitUsed, rateLimit.used);
    if (typeof rateLimit.limit === "number") rateLimitLimit = Math.max(rateLimitLimit, rateLimit.limit);
    if (typeof rateLimit.remaining === "number") rateLimitRemaining = rateLimit.remaining;
  }
  durations.sort((a, b) => a - b);
  const percentile = (value: number) => durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * value))] : 0;
  const rateLimitUsage = rateLimitLimit ? Math.round((rateLimitUsed / rateLimitLimit) * 100) : 0;

  return {
    timestamp: new Date().toISOString(),
    database: { status: database, latencyMs: Math.round(percentile(0.5)), queueWriteHealthy: database === "connected" },
    queue: { queued: queuedJobs, running: runningJobs, failed: failedJobs.length, depth: queuedJobs + runningJobs },
    providers: providers.map((provider) => ({ id: provider.id, name: provider.name, type: provider.type, status: provider.status.toLowerCase(), lastSyncAt: provider.lastSyncAt?.toISOString() ?? null })),
    api: { p50LatencyMs: Math.round(percentile(0.5)), p95LatencyMs: Math.round(percentile(0.95)), requestCount: recentRequests.length, errorCount: [...errorBuckets.values()].reduce((sum, value) => sum + value, 0), rateLimitUsagePercent: rateLimitUsage, rateLimitUsed, rateLimitLimit, rateLimitRemaining },
    failedJobs: failedJobs.map((job) => ({ id: job.id, investigationId: job.investigationId, errorMessage: job.errorMessage, completedAt: job.completedAt?.toISOString() ?? null })),
    errorTrends: [...errorBuckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count })),
    recentActivity: recentActivity.slice(0, 25).map((item) => ({ id: item.id, action: item.action, outcome: record(item.metadata).outcome ?? "info", timestamp: item.createdAt.toISOString() })),
  };
}
