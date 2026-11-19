import { api } from "./api";
import type { EmailHistoryItem, EmailResult } from "../types/email";

export async function investigateEmail(input: { email: string; checkBreachExposure: boolean; searchPublicReferences: boolean }): Promise<{ investigationId: string; result: EmailResult }> {
  const response = await api.post<{ investigationId: string; result: EmailResult }>("/email/intelligence", input);
  return response.data;
}
export async function getEmailHistory(): Promise<{ history: EmailHistoryItem[] }> {
  const response = await api.get<{ history: EmailHistoryItem[] }>("/email/history");
  return response.data;
}
export async function getEmailResult(id: string): Promise<{ result: EmailResult }> {
  const response = await api.get<{ result: EmailResult }>(`/email/results/${id}`);
  return response.data;
}
