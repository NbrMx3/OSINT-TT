import type { User } from "../types/auth";
import { api } from "./api";

export type InvitationRole = "ADMINISTRATOR" | "ANALYST" | "INVESTIGATOR" | "READ_ONLY";
export interface UserInvitation { id: string; email: string; expiresAt: string; acceptedAt: string | null; createdAt: string; role: { name: InvitationRole }; invitedBy: { name: string; email: string } | null; token?: string; inviteUrl?: string; }
export async function getTenantUsers(): Promise<{ users: (User & { isActive: boolean; createdAt: string })[] }> { const response = await api.get("/auth/tenant-users"); return response.data; }
export async function getInvitations(): Promise<{ invitations: UserInvitation[] }> { const response = await api.get("/invitations"); return response.data; }
export async function createInvitation(email: string, role: InvitationRole): Promise<{ invitation: UserInvitation & { token: string; inviteUrl: string } }> { const response = await api.post("/invitations", { email, role }); return response.data; }
export async function revokeInvitation(id: string): Promise<void> { await api.delete(`/invitations/${id}`); }
export async function acceptInvitation(input: { token: string; name: string; password: string }): Promise<{ user: User }> { const response = await api.post("/invitations/accept", input); return response.data; }
