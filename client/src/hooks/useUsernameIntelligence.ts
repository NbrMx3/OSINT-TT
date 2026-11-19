import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsernameHistory, getUsernameResult, investigateUsername } from "../services/usernameService";

export function useUsernameHistory() { return useQuery({ queryKey: ["username-history"], queryFn: getUsernameHistory }); }
export function useUsernameResult(id: string | undefined) { return useQuery({ queryKey: ["username-result", id], queryFn: () => getUsernameResult(id as string), enabled: Boolean(id) }); }
export function useInvestigateUsername() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: investigateUsername, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["username-history"] }); void queryClient.invalidateQueries({ queryKey: ["investigations"] }); } });
}
