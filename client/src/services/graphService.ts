import { api } from "./api";
import type { GraphResponse } from "../types/graph";

export async function getGraph(params?: { investigationId?: string; type?: string }) { const response = await api.get<GraphResponse>("/graph", { params }); return response.data; }
export async function correlateGraph(investigationId?: string) { const response = await api.post<{ graph: GraphResponse; entities: number; relationships: number }>("/graph/correlate", { investigationId }); return response.data; }
export async function saveGraphLayout(payload: { name: string; investigationId?: string; nodes: unknown[]; edges: unknown[] }) { const response = await api.post("/graph/layouts", payload); return response.data; }
