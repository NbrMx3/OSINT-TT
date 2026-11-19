import { api } from "./api";
import type { UsernameHistoryItem, UsernameResult } from "../types/username";

export async function investigateUsername(input: { username: string; platforms: string[] }): Promise<{ investigationId: string; result: UsernameResult }> {
  const response = await api.post<{ investigationId: string; result: UsernameResult }>("/username/intelligence", input);
  return response.data;
}
export async function getUsernameHistory(): Promise<{ history: UsernameHistoryItem[] }> {
  const response = await api.get<{ history: UsernameHistoryItem[] }>("/username/history");
  return response.data;
}
export async function getUsernameResult(id: string): Promise<{ result: UsernameResult }> {
  const response = await api.get<{ result: UsernameResult }>(`/username/results/${id}`);
  return response.data;
}
