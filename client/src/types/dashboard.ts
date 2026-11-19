export interface DashboardMetrics { totalInvestigations: number; totalFindings: number; discoveredEntities: number; activeInvestigations: number; completedInvestigations: number; }
export interface ActivityItem { id: string; title: string; description: string; timestamp: string; severity: "info" | "success" | "warning" | "critical"; }
export interface IntelligenceSource { id: string; name: string; type: string; status: "operational" | "syncing" | "degraded" | "offline"; lastSync?: string; }
export interface InvestigationTrendPoint { label: string; investigations: number; findings: number; }
export interface ThreatOverviewPoint { label: string; critical: number; high: number; medium: number; low: number; }
export interface DashboardResponse { metrics: DashboardMetrics | null; recentActivity: ActivityItem[]; sources: IntelligenceSource[]; investigationTrends: InvestigationTrendPoint[]; threatOverview: ThreatOverviewPoint[]; }
