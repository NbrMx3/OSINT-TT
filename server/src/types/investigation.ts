import type { InvestigationCategory, InvestigationStatus, JobStatus, TargetType } from "@prisma/client";

export interface InvestigationTargetInput { type: TargetType; value: string; label?: string; }
export interface CreateInvestigationInput { title: string; description?: string; category: InvestigationCategory; targets: InvestigationTargetInput[]; selectedModules: string[]; }
export interface InvestigationListQuery { status?: InvestigationStatus; category?: InvestigationCategory; search?: string; page: number; pageSize: number; }
export interface InvestigationJobSummary { id: string; attempt: number; status: JobStatus; progress: number; currentStage: string | null; errorMessage: string | null; queuedAt: Date; startedAt: Date | null; completedAt: Date | null; cancelledAt: Date | null; }
