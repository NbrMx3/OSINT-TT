import type { AuthResponse, User } from "./types";
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(BASE + path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers ?? {}) } });
  if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.detail ?? "The request could not be completed."); }
  return response.json() as Promise<T>;
}
export const register = (email: string, fullName: string, password: string) => request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, full_name: fullName, password }) });
export const login = (email: string, password: string) => request<AuthResponse>("/auth/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ username: email, password }) });
export const profile = (token: string) => request<User>("/auth/me", { headers: { Authorization: "Bearer " + token } });
