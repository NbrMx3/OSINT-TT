export type InvestigationStatus = "DRAFT" | "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "ARCHIVED" | "ACTIVE" | "PAUSED";
export type InvestigationCategory = "DOMAIN" | "IP" | "EMAIL" | "USERNAME" | "WEBSITE" | "THREAT" | "GENERAL";
export type TargetType = "EMAIL" | "USERNAME" | "DOMAIN" | "IP" | "PHONE" | "WEBSITE" | "PERSON";
export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export interface InvestigationTarget { id: string; type: TargetType; value: string; label: string | null; createdAt: string; }
export interface InvestigationJob { id: string; attempt: number; status: JobStatus; progress: number; currentStage: string | null; errorMessage: string | null; queuedAt: string; startedAt: string | null; completedAt: string | null; cancelledAt: string | null; }
export interface Investigation { id: string; tenantId: string; ownerId: string; name: string; description: string | null; category: InvestigationCategory; selectedModules: string[] | null; status: InvestigationStatus; progress: number; failureReason: string | null; results: Record<string, unknown> | null; retryCount: number; maxRetries: number; startedAt: string | null; completedAt: string | null; cancelledAt: string | null; createdAt: string; updatedAt: string; owner?: { id: string; name: string; email?: string }; targets: InvestigationTarget[]; jobs?: InvestigationJob[]; notes?: AnalystNote[]; activityLogs?: ActivityLog[]; _count?: { findings: number; entities: number; relationships?: number }; }
export interface AnalystNote { id: string; content: string; createdAt: string; author: { id: string; name: string }; }
export interface ActivityLog { id: string; action: string; entityType: string | null; entityId: string | null; metadata: Record<string, unknown> | null; createdAt: string; }
export type InvestigationHistory = ActivityLog;
export interface InvestigationListResponse { items: Investigation[]; total: number; page: number; pageSize: number; pageCount: number; }
export interface EvidenceAttachment { name: string; url?: string; sha256?: string }
export interface EvidenceCustodyEntry { action: string; actorId: string; timestamp: string; note: string | null }
export interface EvidenceRecord { id: string; title: string | null; sourceUrl: string | null; contentHash: string | null; screenshots: string[] | null; attachments: EvidenceAttachment[] | null; provenance: Record<string, unknown> | null; chainOfCustody: EvidenceCustodyEntry[] | null; collectedAt: string; findingId: string | null; finding: { id: string; title: string } | null }
export interface InvestigationResults { results: Record<string, unknown> | null; findings: Array<{ id: string; title: string; description: string | null; severity: string; status: string; createdAt: string; evidence: EvidenceRecord[] }>; }
export interface CreateInvestigationInput { title: string; description?: string; category: InvestigationCategory; targets: Array<{ type: TargetType; value: string; label?: string }>; selectedModules: string[]; }
