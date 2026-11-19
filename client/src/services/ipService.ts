import { api } from "./api";
import type { IpHistoryItem, IpResult } from "../types/ip";

export async function investigateIp(ip: string, investigationId?: string): Promise<{ investigationId: string; result: IpResult }> {
  const response = await api.post<{ investigationId: string; result: IpResult }>("/ip/intelligence", { ip, investigationId });
  return response.data;
}

export async function getIpHistory(ip?: string): Promise<{ history: IpHistoryItem[] }> {
  const response = await api.get<{ history: IpHistoryItem[] }>("/ip/history", { params: ip ? { ip } : undefined });
  return response.data;
}

export async function getIpResult(id: string): Promise<{ result: IpResult }> {
  const response = await api.get<{ result: IpResult }>(`/ip/results/${id}`);
  return response.data;
}
