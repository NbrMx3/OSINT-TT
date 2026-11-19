import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, loginUser, logoutUser, registerUser, updateProfile } from "../services/authService";
import type { LoginInput, RegistrationInput } from "../services/authService";
import type { User } from "../types/auth";

interface AuthContextValue { user: User | null; isLoading: boolean; isAuthenticated: boolean; login: (input: LoginInput) => Promise<User>; register: (input: RegistrationInput) => Promise<User>; logout: () => Promise<void>; updateUser: (input: { name: string }) => Promise<User>; }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const userQuery = useQuery({ queryKey: ["me"], queryFn: getCurrentUser, retry: false, staleTime: 5 * 60_000 });
  const value = useMemo<AuthContextValue>(() => ({ user: userQuery.data ?? null, isLoading: userQuery.isLoading, isAuthenticated: Boolean(userQuery.data), login: async (input) => { const result = await loginUser(input); queryClient.setQueryData(["me"], result.user); return result.user; }, register: async (input) => { const result = await registerUser(input); queryClient.setQueryData(["me"], result.user); return result.user; }, logout: async () => { await logoutUser(); queryClient.setQueryData(["me"], null); }, updateUser: async (input) => { const result = await updateProfile(input); queryClient.setQueryData(["me"], result.user); return result.user; } }), [queryClient, userQuery.data, userQuery.isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used within AuthProvider"); return context; }
