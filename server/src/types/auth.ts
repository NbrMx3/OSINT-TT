import type { RoleName } from "@prisma/client";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: RoleName;
  tokenVersion: number;
  sessionId: string;
}

export interface AdminAuthContext {
  adminId: string;
  tokenVersion: number;
  sessionId: string;
}

export interface PublicAdmin {
  id: string;
  email: string;
  name: string;
  mfaEnabled: boolean;
}

export interface PublicUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: RoleName;
  mfaEnabled: boolean;
}
