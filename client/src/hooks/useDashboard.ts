import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard } from "../services/dashboardService";

export function useDashboard() {
  const queryClient = useQueryClient();
  useEffect(() => { const listener = () => void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); window.addEventListener("osint-realtime-snapshot", listener); return () => window.removeEventListener("osint-realtime-snapshot", listener); }, [queryClient]);
  return useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, retry: 1, staleTime: 30_000 });
}
