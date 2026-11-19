import type { HealthResponse } from "../types/api";
import { api } from "./api";

export async function getHealth(): Promise<HealthResponse> { const response = await api.get<HealthResponse>("/health"); return response.data; }
