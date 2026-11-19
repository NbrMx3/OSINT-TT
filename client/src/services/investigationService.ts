import type { CreateInvestigationInput, Investigation, InvestigationCategory, InvestigationHistory, InvestigationListResponse, InvestigationResults, InvestigationStatus } from "../types/investigation";
import { api } from "./api";

export async function getInvestigations(params: { status?: InvestigationStatus; category?: InvestigationCategory; search?: string } = {}): Promise<InvestigationListResponse> { const response = await api.get<InvestigationListResponse>("/investigations", { params }); return response.data; }
export async function getInvestigation(id: string): Promise<{ investigation: Investigation }> { const response = await api.get<{ investigation: Investigation }>(`/investigations/${id}`); return response.data; }
export async function createInvestigation(input: CreateInvestigationInput): Promise<{ investigation: Investigation }> { const response = await api.post<{ investigation: Investigation }>("/investigations", input); return response.data; }
export async function updateInvestigation(id: string, input: Partial<CreateInvestigationInput>): Promise<{ investigation: Investigation }> { const response = await api.patch<{ investigation: Investigation }>(`/investigations/${id}`, input); return response.data; }
export async function startInvestigation(id: string): Promise<void> { await api.post(`/investigations/${id}/start`); }
export async function cancelInvestigation(id: string): Promise<void> { await api.post(`/investigations/${id}/cancel`); }
export async function retryInvestigation(id: string): Promise<void> { await api.post(`/investigations/${id}/retry`); }
export async function archiveInvestigation(id: string): Promise<void> { await api.post(`/investigations/${id}/archive`); }
export async function deleteInvestigation(id: string): Promise<void> { await api.delete(`/investigations/${id}`, { data: { confirmation: "DELETE" } }); }
export async function addAnalystNote(id: string, content: string): Promise<void> { await api.post(`/investigations/${id}/notes`, { content }); }
export async function getInvestigationHistory(id: string): Promise<{ history: InvestigationHistory[] }> { const response = await api.get<{ history: InvestigationHistory[] }>(`/investigations/${id}/history`); return response.data; }
export async function getInvestigationResults(id: string): Promise<InvestigationResults> { const response = await api.get<InvestigationResults>(`/investigations/${id}/results`); return response.data; }
