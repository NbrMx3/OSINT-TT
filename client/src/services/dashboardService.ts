import type { DashboardResponse } from "../types/dashboard";
import { api } from "./api";

export interface SavedDashboard { id: string; name: string; layout: string[]; filters: Record<string, unknown> | null; isPinned: boolean }
export async function getSavedDashboards(): Promise<{ dashboards: SavedDashboard[] }> { const response = await api.get<{ dashboards: SavedDashboard[] }>("/dashboard/saved"); return response.data; }
export async function createSavedDashboard(input: { name: string; layout: string[]; filters?: Record<string, unknown>; isPinned?: boolean }): Promise<{ dashboard: SavedDashboard }> { const response = await api.post<{ dashboard: SavedDashboard }>("/dashboard/saved", input); return response.data; }
export async function deleteSavedDashboard(id: string): Promise<void> { await api.delete(`/dashboard/saved/${id}`); }
export async function getDashboard(filters: { from?: string; to?: string; tenantId?: string } = {}): Promise<DashboardResponse> { const response = await api.get<DashboardResponse>("/dashboard", { params: filters }); return response.data; }
