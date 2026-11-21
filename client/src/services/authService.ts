import type { AuthResponse, MfaChallengeResponse, User } from "../types/auth";
import { api } from "./api";

export interface RegistrationInput { name: string; email: string; password: string; organizationName?: string; }
export interface LoginInput { email: string; password: string; }

export async function registerUser(input: RegistrationInput): Promise<AuthResponse> { const response = await api.post<AuthResponse>("/auth/register", input); return response.data; }
export async function loginUser(input: LoginInput): Promise<AuthResponse | MfaChallengeResponse> { const response = await api.post<AuthResponse | MfaChallengeResponse>("/auth/login", input); return response.data; }
export async function verifyUserMfa(challengeToken: string, code: string): Promise<AuthResponse> { const response = await api.post<AuthResponse>("/auth/mfa/verify", { challengeToken, code }); return response.data; }
export async function getCurrentUser(): Promise<User> { const response = await api.get<AuthResponse>("/auth/me"); return response.data.user; }
export async function logoutUser(): Promise<void> { await api.post("/auth/logout"); }
export async function updateProfile(input: { name: string }): Promise<AuthResponse> { const response = await api.patch<AuthResponse>("/auth/me", input); return response.data; }
export async function startUserMfaSetup(): Promise<{ secret: string; otpauthUri: string }> { const response = await api.post("/auth/mfa/setup"); return response.data; }
export async function enableUserMfa(code: string): Promise<{ recoveryCodes: string[] }> { const response = await api.post("/auth/mfa/enable", { code }); return response.data; }
export async function disableUserMfa(code: string): Promise<void> { await api.post("/auth/mfa/disable", { code }); }
export interface AuthSession { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastUsedAt: string; expiresAt: string; current: boolean; }
export async function getUserSessions(): Promise<{ sessions: AuthSession[] }> { const response = await api.get("/auth/sessions"); return response.data; }
export async function revokeUserSession(sessionId: string): Promise<void> { await api.delete("/auth/sessions", { data: { sessionId } }); }
export async function revokeAllUserSessions(): Promise<void> { await api.post("/auth/sessions/revoke-all"); }
export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> { await api.post("/auth/password", { currentPassword, newPassword }); }
export async function requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> { const response = await api.post("/auth/forgot-password", { email }); return response.data; }
export async function resetPassword(token: string, password: string): Promise<{ message: string }> { const response = await api.post("/auth/reset-password", { token, password }); return response.data; }
