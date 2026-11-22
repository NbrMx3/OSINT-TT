import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSavedDashboard, deleteSavedDashboard, getDashboard, getSavedDashboards } from "../services/dashboardService";

export function useDashboard(filters: { from?: string; to?: string; tenantId?: string } = {}) {
  const queryClient = useQueryClient();
  useEffect(() => { const listener = () => void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); window.addEventListener("osint-realtime-snapshot", listener); return () => window.removeEventListener("osint-realtime-snapshot", listener); }, [queryClient]);
  return useQuery({ queryKey: ["dashboard", filters], queryFn: () => getDashboard(filters), retry: 1, staleTime: 30_000 });
}

export function useSavedDashboards() { return useQuery({ queryKey: ["saved-dashboards"], queryFn: getSavedDashboards }); }
export function useCreateSavedDashboard() { const queryClient = useQueryClient(); return useMutation({ mutationFn: createSavedDashboard, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["saved-dashboards"] }); } }); }
export function useDeleteSavedDashboard() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteSavedDashboard, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["saved-dashboards"] }); } }); }
