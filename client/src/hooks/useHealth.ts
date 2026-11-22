import { useQuery } from "@tanstack/react-query";
import { getHealth, getSystemHealth } from "../services/healthService";

export function useSystemHealth() { return useQuery({ queryKey: ["system-health"], queryFn: getSystemHealth, refetchInterval: 10000 }); }
export function useHealth() { return useQuery({ queryKey: ["health"], queryFn: getHealth, retry: 1 }); }
