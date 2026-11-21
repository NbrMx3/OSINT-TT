import { useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, loginUser, logoutUser, registerUser, updateProfile, verifyUserMfa } from "../services/authService";
import { AuthContext, type AuthContextValue } from "./contextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const userQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser, retry: false, staleTime: 5 * 60_000 });
  const value = useMemo<AuthContextValue>(() => ({ user: userQuery.data ?? null, isLoading: userQuery.isLoading, isAuthenticated: Boolean(userQuery.data), login: async (input) => { const result = await loginUser(input); if ("mfaRequired" in result) return result; queryClient.setQueryData(["me"], result.user); return result.user; }, verifyMfa: async (challengeToken, code) => { const result = await verifyUserMfa(challengeToken, code); queryClient.setQueryData(["me"], result.user); return result.user; }, register: async (input) => { const result = await registerUser(input); queryClient.setQueryData(["me"], result.user); return result.user; }, logout: async () => { await logoutUser(); queryClient.setQueryData(["me"], null); }, updateUser: async (input) => { const result = await updateProfile(input); queryClient.setQueryData(["me"], result.user); return result.user; } }), [queryClient, userQuery.data, userQuery.isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
