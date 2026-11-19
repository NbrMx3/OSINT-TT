import { api } from "./api";
import type { DomainHistoryItem, DomainResult } from "../types/domain";

export async function investigateDomain(domain: string, investigationId?: string): Promise<{ investigationId: string; result: DomainResult }> { const response = await api.post<{ investigationId: string; result: DomainResult }>("/domain/intelligence", { domain, investigationId }); return response.data; }
export async function getDomainHistory(domain?: string): Promise<{ history: DomainHistoryItem[] }> { const response = await api.get<{ history: DomainHistoryItem[] }>("/domain/history", { params: domain ? { domain } : undefined }); return response.data; }
export async function getDomainResult(id: string): Promise<{ result: DomainResult }> { const response = await api.get<{ result: DomainResult }>(`/domain/results/${id}`); return response.data; }
