import { prisma } from "../config/prisma";

export async function getAnalytics(tenantId: string) {
  const [investigations, findings, entities, activity, sources, threatResults] = await Promise.all([
    prisma.investigation.findMany({ where: { tenantId }, select: { id: true, status: true, category: true, createdAt: true, completedAt: true } }),
    prisma.finding.findMany({ where: { tenantId }, select: { severity: true, status: true, createdAt: true } }),
    prisma.entity.count({ where: { tenantId } }),
    prisma.activityLog.findMany({ where: { tenantId }, select: { id: true, action: true, createdAt: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.intelligenceSource.findMany({ where: { tenantId }, select: { id: true, name: true, type: true, status: true, lastSyncAt: true }, orderBy: { updatedAt: "desc" } }),
    prisma.threatIntelligenceResult.findMany({ where: { tenantId }, select: { data: true, collectedAt: true } }),
  ]);
  const completed = investigations.filter((item) => item.status === "COMPLETED").length;
  const active = investigations.filter((item) => item.status === "RUNNING" || item.status === "PENDING").length;
  const monthMap = new Map<string, { investigations: number; findings: number }>();
  for (const item of investigations) { const key = monthKey(item.createdAt); monthMap.set(key, { investigations: (monthMap.get(key)?.investigations ?? 0) + 1, findings: monthMap.get(key)?.findings ?? 0 }); }
  for (const item of findings) { const key = monthKey(item.createdAt); monthMap.set(key, { investigations: monthMap.get(key)?.investigations ?? 0, findings: (monthMap.get(key)?.findings ?? 0) + 1 }); }
  const threatMap = new Map<string, { critical: number; high: number; medium: number; low: number }>();
  for (const result of threatResults) {
    const rawClassification = record(result.data).classification;
    const classification = typeof rawClassification === "string" ? rawClassification.toLowerCase() : "unknown";
    const key = classification === "malicious" ? "malicious" : classification === "suspicious" ? "suspicious" : classification === "clean" ? "clean" : "unknown";
    const current = threatMap.get(key) ?? { critical: 0, high: 0, medium: 0, low: 0 };
    current.medium += 1; threatMap.set(key, current);
  }
  const analystMap = new Map<string, number>();
  for (const item of activity) { const name = item.user?.name ?? item.user?.email ?? "System"; analystMap.set(name, (analystMap.get(name) ?? 0) + 1); }
  return {
    metrics: { totalInvestigations: investigations.length, totalFindings: findings.length, discoveredEntities: entities, activeInvestigations: active, completedInvestigations: completed },
    recentActivity: activity.slice(0, 20).map((item) => ({ id: item.id, title: item.action.replace(/_/g, " "), description: item.user?.name ?? "System activity", timestamp: item.createdAt.toISOString(), severity: item.action.includes("FAILED") ? "critical" : item.action.includes("COMPLETED") ? "success" : "info" })),
    sources: sources.map((source) => ({ id: source.id, name: source.name, type: source.type, status: source.status.toLowerCase(), ...(source.lastSyncAt ? { lastSync: source.lastSyncAt.toISOString() } : {}) })),
    investigationTrends: [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([label, value]) => ({ label, ...value })),
    threatOverview: [...threatMap.entries()].map(([label, value]) => ({ label, ...value })),
    findingsByCategory: Object.entries(countBy(findings, (item) => item.severity)).map(([label, count]) => ({ label, count })),
    analystActivity: [...analystMap.entries()].map(([label, count]) => ({ label, count })),
    completionStatistics: { completed, total: investigations.length, rate: investigations.length ? Number((completed / investigations.length).toFixed(3)) : 0 },
  };
}
function monthKey(date: Date) { return date.toISOString().slice(0, 7); }
function countBy<T>(values: T[], key: (value: T) => string) { return values.reduce<Record<string, number>>((result, value) => { const name = key(value); result[name] = (result[name] ?? 0) + 1; return result; }, {}); }
function record(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }
