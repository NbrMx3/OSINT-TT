import type { DashboardResponse } from "../types/dashboard";
import { api } from "./api";

export async function getDashboard(): Promise<DashboardResponse> { const response = await api.get<DashboardResponse>("/dashboard"); return response.data; }
