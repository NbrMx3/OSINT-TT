import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteReport, generateReport, getReport, getReports } from "../services/reportService";
export function useReports(params: { search?: string; status?: string } = {}) { return useQuery({ queryKey: ["reports", params], queryFn: () => getReports(params) }); }
export function useReport(id: string | undefined) { return useQuery({ queryKey: ["report", id], queryFn: () => getReport(id as string), enabled: Boolean(id) }); }
export function useGenerateReport() { const queryClient = useQueryClient(); return useMutation({ mutationFn: generateReport, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["reports"] }); } }); }
export function useDeleteReport() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteReport, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["reports"] }); } }); }
