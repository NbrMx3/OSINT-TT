import { createContext } from "react";
import type { User } from "../types/auth";
import type { LoginInput, RegistrationInput } from "../services/authService";
import type { MfaChallengeResponse } from "../types/auth";

export interface AuthContextValue { user: User | null; isLoading: boolean; isAuthenticated: boolean; login: (input: LoginInput) => Promise<User | MfaChallengeResponse>; verifyMfa: (challengeToken: string, code: string) => Promise<User>; register: (input: RegistrationInput) => Promise<User>; logout: () => Promise<void>; updateUser: (input: { name: string }) => Promise<User>; }
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
