import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { correlateGraph, getGraph, saveGraphLayout } from "../services/graphService";

export function useGraph() { return useQuery({ queryKey: ["graph"], queryFn: () => getGraph(), staleTime: 30_000 }); }
export function useCorrelateGraph() { const queryClient = useQueryClient(); return useMutation({ mutationFn: correlateGraph, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["graph"] }); } }); }
export function useSaveGraphLayout() { return useMutation({ mutationFn: saveGraphLayout }); }
