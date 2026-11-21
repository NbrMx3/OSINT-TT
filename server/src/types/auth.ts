import type { RoleName } from "@prisma/client";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: RoleName;
  tokenVersion: number;
}

export interface AdminAuthContext {
  adminId: string;
  tokenVersion: number;
}

export interface PublicAdmin {
  id: string;
  email: string;
  name: string;
}

export interface PublicUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: RoleName;
}
