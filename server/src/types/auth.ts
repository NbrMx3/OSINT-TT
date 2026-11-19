import type { RoleName } from "@prisma/client";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: RoleName;
  tokenVersion: number;
}

export interface PublicUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: RoleName;
}
