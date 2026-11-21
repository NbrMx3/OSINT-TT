import type { Admin } from "../types/admin";
import { api } from "./api";

export interface AdminAuthResponse { admin: Admin; }
export interface AdminLoginInput { email: string; password: string; }

export async function loginAdmin(input: AdminLoginInput): Promise<AdminAuthResponse> { const response = await api.post<AdminAuthResponse>("/admin/auth/login", input); return response.data; }
export async function getCurrentAdmin(): Promise<Admin> { const response = await api.get<AdminAuthResponse>("/admin/auth/me"); return response.data.admin; }
export async function logoutAdmin(): Promise<void> { await api.post("/admin/auth/logout"); }
