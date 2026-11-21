export type UserRole = "ADMINISTRATOR" | "ANALYST" | "INVESTIGATOR" | "READ_ONLY";
export interface User { id: string; tenantId: string; email: string; name: string; role: UserRole; mfaEnabled: boolean; }
export interface AuthResponse { user: User; }
export interface MfaChallengeResponse { mfaRequired: true; challengeToken: string; }
