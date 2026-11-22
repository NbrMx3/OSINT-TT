import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReportSchedule, deleteReport, deleteReportSchedule, generateReport, getReport, getReports, getReportSchedules, updateReportSchedule } from "../services/reportService";
export function useReports(params: { search?: string; status?: string } = {}) { return useQuery({ queryKey: ["reports", params], queryFn: () => getReports(params) }); }
export function useReport(id: string | undefined) { return useQuery({ queryKey: ["report", id], queryFn: () => getReport(id as string), enabled: Boolean(id) }); }
export function useGenerateReport() { const queryClient = useQueryClient(); return useMutation({ mutationFn: generateReport, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["reports"] }); } }); }
export function useReportSchedules() { return useQuery({ queryKey: ["report-schedules"], queryFn: getReportSchedules }); }
export function useCreateReportSchedule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: createReportSchedule, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["report-schedules"] }); } }); }
export function useUpdateReportSchedule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { id: string; values: Parameters<typeof updateReportSchedule>[1] }) => updateReportSchedule(input.id, input.values), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["report-schedules"] }); } }); }
export function useDeleteReportSchedule() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteReportSchedule, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["report-schedules"] }); } }); }
export function useDeleteReport() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteReport, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["reports"] }); } }); }
