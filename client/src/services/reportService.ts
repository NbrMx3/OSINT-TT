import { api } from "./api";
import type { ReportContent, ReportListItem } from "../types/report";

export async function getReports(params: { search?: string; status?: string } = {}) { const response = await api.get<{ reports: ReportListItem[] }>("/reports", { params }); return response.data; }
export async function generateReport(input: { investigationId: string; title?: string }) { const response = await api.post<{ report: ReportListItem }>("/reports", input); return response.data; }
export async function getReport(id: string) { const response = await api.get<{ report: ReportListItem & { content: ReportContent } }>(`/reports/${id}`); return response.data; }
export async function deleteReport(id: string) { await api.delete(`/reports/${id}`); }
export function reportPdfUrl(id: string) { return `/api/reports/${id}/pdf`; }
export function reportExportUrl(id: string, format: "json" | "csv") { return `/api/reports/${id}/export?format=${format}`; }
