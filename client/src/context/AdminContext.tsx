import { useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentAdmin, loginAdmin, logoutAdmin, verifyAdminMfa, type AdminLoginInput } from "../services/adminAuthService";
import { AdminContext, type AdminContextValue } from "./adminContextValue";

export function AdminProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const adminQuery = useQuery({ queryKey: ["admin-me"], queryFn: getCurrentAdmin, retry: false, staleTime: 5 * 60_000 });
  const value = useMemo<AdminContextValue>(() => ({ admin: adminQuery.data ?? null, isLoading: adminQuery.isLoading, isAuthenticated: Boolean(adminQuery.data), login: async (input: AdminLoginInput) => { const result = await loginAdmin(input); if ("mfaRequired" in result) return result; queryClient.setQueryData(["admin-me"], result.admin); return result.admin; }, verifyMfa: async (challengeToken, code) => { const result = await verifyAdminMfa(challengeToken, code); queryClient.setQueryData(["admin-me"], result.admin); return result.admin; }, logout: async () => { await logoutAdmin(); queryClient.setQueryData(["admin-me"], null); } }), [adminQuery.data, adminQuery.isLoading, queryClient]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
