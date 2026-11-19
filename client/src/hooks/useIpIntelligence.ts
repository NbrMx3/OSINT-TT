import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getIpHistory, getIpResult, investigateIp } from "../services/ipService";

export function useIpHistory() {
  return useQuery({ queryKey: ["ip-history"], queryFn: () => getIpHistory() });
}

export function useIpResult(id: string | undefined) {
  return useQuery({ queryKey: ["ip-result", id], queryFn: () => getIpResult(id as string), enabled: Boolean(id) });
}

export function useInvestigateIp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ip, investigationId }: { ip: string; investigationId?: string }) => investigateIp(ip, investigationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ip-history"] });
      void queryClient.invalidateQueries({ queryKey: ["investigations"] });
    },
  });
}
