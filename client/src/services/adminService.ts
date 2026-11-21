import type { AdminActivityResponse, AdminDashboardData } from "../types/admin";
import { api } from "./api";

export async function getAdminDashboard(): Promise<AdminDashboardData> { const response = await api.get<AdminDashboardData>("/admin/dashboard"); return response.data; }
export async function getAdminActivityLogs(params: { page: number; pageSize: number; search: string }): Promise<AdminActivityResponse> { const response = await api.get<AdminActivityResponse>("/admin/activity-logs", { params }); return response.data; }
