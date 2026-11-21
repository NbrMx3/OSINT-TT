import type { Admin } from "../types/admin";
import type { MfaChallengeResponse } from "../types/auth";
import { api } from "./api";

export interface AdminAuthResponse { admin: Admin; }
export interface AdminLoginInput { email: string; password: string; }

export async function loginAdmin(input: AdminLoginInput): Promise<AdminAuthResponse | MfaChallengeResponse> { const response = await api.post<AdminAuthResponse | MfaChallengeResponse>("/admin/auth/login", input); return response.data; }
export async function verifyAdminMfa(challengeToken: string, code: string): Promise<AdminAuthResponse> { const response = await api.post<AdminAuthResponse>("/admin/auth/mfa/verify", { challengeToken, code }); return response.data; }
export async function getCurrentAdmin(): Promise<Admin> { const response = await api.get<AdminAuthResponse>("/admin/auth/me"); return response.data.admin; }
export async function logoutAdmin(): Promise<void> { await api.post("/admin/auth/logout"); }
export async function startAdminMfaSetup(): Promise<{ secret: string; otpauthUri: string }> { const response = await api.post("/admin/auth/mfa/setup"); return response.data; }
export async function enableAdminMfa(code: string): Promise<{ recoveryCodes: string[] }> { const response = await api.post("/admin/auth/mfa/enable", { code }); return response.data; }
export async function disableAdminMfa(code: string): Promise<void> { await api.post("/admin/auth/mfa/disable", { code }); }
export type AdminSession = { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastUsedAt: string; expiresAt: string; current: boolean };
export async function getAdminSessions(): Promise<{ sessions: AdminSession[] }> { const response = await api.get("/admin/auth/sessions"); return response.data; }
export async function revokeAdminSession(sessionId: string): Promise<void> { await api.delete("/admin/auth/sessions", { data: { sessionId } }); }
export async function revokeAllAdminSessions(): Promise<void> { await api.post("/admin/auth/sessions/revoke-all"); }
export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> { await api.post("/admin/auth/password", { currentPassword, newPassword }); }
