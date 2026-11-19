import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmailHistory, getEmailResult, investigateEmail } from "../services/emailService";

export function useEmailHistory() { return useQuery({ queryKey: ["email-history"], queryFn: getEmailHistory }); }
export function useEmailResult(id: string | undefined) { return useQuery({ queryKey: ["email-result", id], queryFn: () => getEmailResult(id as string), enabled: Boolean(id) }); }
export function useInvestigateEmail() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: investigateEmail, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["email-history"] }); void queryClient.invalidateQueries({ queryKey: ["investigations"] }); } });
}
