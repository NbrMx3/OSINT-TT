import { createContext } from "react";
import type { Admin } from "../types/admin";
import type { AdminLoginInput } from "../services/adminAuthService";
import type { MfaChallengeResponse } from "../types/auth";

export interface AdminContextValue { admin: Admin | null; isLoading: boolean; isAuthenticated: boolean; login: (input: AdminLoginInput) => Promise<Admin | MfaChallengeResponse>; verifyMfa: (challengeToken: string, code: string) => Promise<Admin>; logout: () => Promise<void>; }
export const AdminContext = createContext<AdminContextValue | undefined>(undefined);
