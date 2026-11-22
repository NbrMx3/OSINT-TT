import { api } from "./api";
import type { ReportContent, ReportFrequency, ReportListItem, ReportSchedule, ReportTemplate } from "../types/report";

export async function getReports(params: { search?: string; status?: string } = {}) { const response = await api.get<{ reports: ReportListItem[] }>("/reports", { params }); return response.data; }
export async function generateReport(input: { investigationId: string; title?: string; template?: ReportTemplate; branding?: Record<string, unknown> }) { const response = await api.post<{ report: ReportListItem }>("/reports", input); return response.data; }
export async function getReport(id: string) { const response = await api.get<{ report: ReportListItem & { content: ReportContent } }>(`/reports/${id}`); return response.data; }
export async function getReportSchedules() { const response = await api.get<{ schedules: ReportSchedule[] }>("/reports/schedules"); return response.data; }
export async function createReportSchedule(input: { investigationId: string; name: string; template?: ReportTemplate; frequency?: ReportFrequency; titleTemplate?: string; branding?: Record<string, unknown>; enabled?: boolean }) { const response = await api.post<{ schedule: ReportSchedule }>("/reports/schedules", input); return response.data; }
export async function updateReportSchedule(id: string, input: Partial<{ name: string; template: ReportTemplate; frequency: ReportFrequency; titleTemplate: string; branding: Record<string, unknown>; enabled: boolean }>) { const response = await api.patch<{ schedule: ReportSchedule }>(`/reports/schedules/${id}`, input); return response.data; }
export async function deleteReportSchedule(id: string) { await api.delete(`/reports/schedules/${id}`); }
export async function deleteReport(id: string) { await api.delete(`/reports/${id}`); }
export function reportPdfUrl(id: string) { return `/api/reports/${id}/pdf`; }
export function reportExportUrl(id: string, format: "json" | "csv") { return `/api/reports/${id}/export?format=${format}`; }
