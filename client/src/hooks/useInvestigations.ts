import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAnalystNote, addEvidenceCustody, archiveInvestigation, cancelInvestigation, createInvestigation, createInvestigationEvidence, createInvestigationTask, deleteInvestigation, getInvestigation, getInvestigationCollaborators, getInvestigationEvidence, getInvestigationHistory, getInvestigationResults, getInvestigations, retryInvestigation, startInvestigation, updateInvestigation, updateInvestigationCollaboration, updateInvestigationTask } from "../services/investigationService";
import type { CreateInvestigationInput, InvestigationCategory, InvestigationPriority, InvestigationStatus, TaskStatus } from "../types/investigation";

export function useInvestigations(params: { status?: InvestigationStatus; category?: InvestigationCategory; search?: string } = {}) { return useQuery({ queryKey: ["investigations", params], queryFn: () => getInvestigations(params) }); }
export function useInvestigation(id: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!id) return;
    const listener = () => void queryClient.invalidateQueries({ queryKey: ["investigation", id] });
    window.addEventListener("osint-realtime-snapshot", listener);
    return () => window.removeEventListener("osint-realtime-snapshot", listener);
  }, [id, queryClient]);
  return useQuery({ queryKey: ["investigation", id], queryFn: () => getInvestigation(id as string), enabled: Boolean(id), refetchInterval: (query) => { const status = query.state.data?.investigation.status; return status === "PENDING" || status === "RUNNING" ? 5000 : false; } });
}
export function useInvestigationHistory(id: string | undefined) { return useQuery({ queryKey: ["investigation-history", id], queryFn: () => getInvestigationHistory(id as string), enabled: Boolean(id) }); }
export function useInvestigationResults(id: string | undefined) { return useQuery({ queryKey: ["investigation-results", id], queryFn: () => getInvestigationResults(id as string), enabled: Boolean(id) }); }
export function useInvestigationCollaborators() { return useQuery({ queryKey: ["investigation-collaborators"], queryFn: getInvestigationCollaborators }); }
export function useInvestigationEvidence(id: string | undefined) { return useQuery({ queryKey: ["investigation-evidence", id], queryFn: () => getInvestigationEvidence(id as string), enabled: Boolean(id) }); }

function useInvestigationMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>, id?: string) { const queryClient = useQueryClient(); return useMutation({ mutationFn, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["investigations"] }); if (id) void queryClient.invalidateQueries({ queryKey: ["investigation", id] }); void queryClient.invalidateQueries({ queryKey: ["investigation-history", id] }); void queryClient.invalidateQueries({ queryKey: ["investigation-results", id] }); void queryClient.invalidateQueries({ queryKey: ["investigation-evidence", id] }); } }); }
export function useCreateInvestigation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: CreateInvestigationInput) => createInvestigation(input), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["investigations"] }); } }); }
export function useUpdateInvestigation(id: string) { return useInvestigationMutation((input: Partial<CreateInvestigationInput>) => updateInvestigation(id, input), id); }
export function useStartInvestigation(id: string) { return useInvestigationMutation(() => startInvestigation(id), id); }
export function useCancelInvestigation(id: string) { return useInvestigationMutation(() => cancelInvestigation(id), id); }
export function useRetryInvestigation(id: string) { return useInvestigationMutation(() => retryInvestigation(id), id); }
export function useArchiveInvestigation(id: string) { return useInvestigationMutation(() => archiveInvestigation(id), id); }
export function useDeleteInvestigation(id: string) { return useInvestigationMutation(() => deleteInvestigation(id), id); }
export function useAddAnalystNote(id: string) { return useInvestigationMutation((input: { content: string; mentions?: string[] }) => addAnalystNote(id, input.content, input.mentions), id); }
export function useCreateInvestigationEvidence(id: string) { const mutation = useInvestigationMutation((input: Parameters<typeof createInvestigationEvidence>[1]) => createInvestigationEvidence(id, input), id); return mutation; }
export function useUpdateInvestigationCollaboration(id: string) { return useInvestigationMutation((input: { status?: InvestigationStatus; priority?: InvestigationPriority; assigneeId?: string | null; deadline?: string | null }) => updateInvestigationCollaboration(id, input), id); }
export function useCreateInvestigationTask(id: string) { return useInvestigationMutation((input: { title: string; description?: string; status?: TaskStatus; priority?: InvestigationPriority; assigneeId?: string; dueAt?: string }) => createInvestigationTask(id, input), id); }
export function useUpdateInvestigationTask(id: string) { return useInvestigationMutation((input: { taskId: string; title?: string; description?: string; status?: TaskStatus; priority?: InvestigationPriority; assigneeId?: string | null; dueAt?: string | null }) => updateInvestigationTask(id, input.taskId, input), id); }
export function useAddEvidenceCustody(id: string) { const mutation = useInvestigationMutation((input: { evidenceId: string; action: string; note?: string }) => addEvidenceCustody(id, input.evidenceId, { action: input.action, note: input.note }), id); return mutation; }
