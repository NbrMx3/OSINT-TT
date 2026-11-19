import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../services/dashboardService";

export function useDashboard() { return useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, retry: 1, staleTime: 30_000 }); }
