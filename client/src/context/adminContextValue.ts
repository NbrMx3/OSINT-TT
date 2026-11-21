import { createContext } from "react";
import type { Admin } from "../types/admin";
import type { AdminLoginInput } from "../services/adminAuthService";

export interface AdminContextValue { admin: Admin | null; isLoading: boolean; isAuthenticated: boolean; login: (input: AdminLoginInput) => Promise<Admin>; logout: () => Promise<void>; }
export const AdminContext = createContext<AdminContextValue | undefined>(undefined);
