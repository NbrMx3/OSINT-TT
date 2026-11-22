import type { HealthResponse } from "../types/api";
import { api } from "./api";

export interface SystemHealth { timestamp: string; database: { status: string; latencyMs: number; queueWriteHealthy: boolean }; queue: { queued: number; running: number; failed: number; depth: number }; providers: Array<{ id: string; name: string; type: string; status: string; lastSyncAt: string | null }>; api: { p50LatencyMs: number; p95LatencyMs: number; requestCount: number; errorCount: number; rateLimitUsagePercent: number; rateLimitUsed: number; rateLimitLimit: number; rateLimitRemaining: number }; failedJobs: Array<{ id: string; investigationId: string; errorMessage: string | null; completedAt: string | null }>; errorTrends: Array<{ hour: string; count: number }>; recentActivity: Array<{ id: string; action: string; outcome: string; timestamp: string }> }
export async function getSystemHealth(): Promise<SystemHealth> { const response = await api.get<SystemHealth>("/system-health"); return response.data; }
export async function getHealth(): Promise<HealthResponse> { const response = await api.get<HealthResponse>("/health"); return response.data; }
