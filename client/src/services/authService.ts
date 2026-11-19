import type { AuthResponse, User } from "../types/auth";
import { api } from "./api";

export interface RegistrationInput { name: string; email: string; password: string; organizationName?: string; }
export interface LoginInput { email: string; password: string; }

export async function registerUser(input: RegistrationInput): Promise<AuthResponse> { const response = await api.post<AuthResponse>("/auth/register", input); return response.data; }
export async function loginUser(input: LoginInput): Promise<AuthResponse> { const response = await api.post<AuthResponse>("/auth/login", input); return response.data; }
export async function getCurrentUser(): Promise<User> { const response = await api.get<AuthResponse>("/auth/me"); return response.data.user; }
export async function logoutUser(): Promise<void> { await api.post("/auth/logout"); }
export async function updateProfile(input: { name: string }): Promise<AuthResponse> { const response = await api.patch<AuthResponse>("/auth/me", input); return response.data; }
export async function requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> { const response = await api.post("/auth/forgot-password", { email }); return response.data; }
export async function resetPassword(token: string, password: string): Promise<{ message: string }> { const response = await api.post("/auth/reset-password", { token, password }); return response.data; }
