import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDomainHistory, getDomainResult, investigateDomain } from "../services/domainService";

export function useDomainHistory() { return useQuery({ queryKey: ["domain-history"], queryFn: () => getDomainHistory() }); }
export function useDomainResult(id: string | undefined) { return useQuery({ queryKey: ["domain-result", id], queryFn: () => getDomainResult(id as string), enabled: Boolean(id) }); }
export function useInvestigateDomain() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ domain, investigationId }: { domain: string; investigationId?: string }) => investigateDomain(domain, investigationId), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["domain-history"] }); void queryClient.invalidateQueries({ queryKey: ["investigations"] }); } }); }
