import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { authCookieName, authCookieOptions, changeUserPassword, disableUserMfa, enableUserMfa, getPublicUser, listUserSessions, loginUser, registerUser, requestPasswordReset, resetPassword, revokeTokens, revokeUserSession, startUserMfaSetup, updateProfile, verifyUserMfa } from "../services/authService";

const strongPassword = z.string().min(12).max(128).regex(/[A-Z]/, "Password must include an uppercase letter").regex(/[a-z]/, "Password must include a lowercase letter").regex(/[0-9]/, "Password must include a number").regex(/[^A-Za-z0-9]/, "Password must include a special character");
const registrationSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), password: strongPassword, organizationName: z.string().trim().max(120).optional() });
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(254) });
const resetPasswordSchema = z.object({ token: z.string().min(32).max(128), password: strongPassword });
const profileSchema = z.object({ name: z.string().trim().min(2).max(100) });
const mfaCodeSchema = z.object({ code: z.string().trim().min(6).max(32) });
const sessionSchema = z.object({ sessionId: z.string().min(10).max(100) });
const passwordChangeSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: strongPassword });

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const input = parse(registrationSchema, request.body); const result = await registerUser(input, metadata(request)); setAuthCookie(response, result.token); response.status(201).json({ user: result.user }); } catch (error) { next(error); }
}

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const input = parse(loginSchema, request.body); const result = await loginUser(input, metadata(request)); if ("mfaRequired" in result) { response.json(result); return; } setAuthCookie(response, result.token); response.json({ user: result.user }); } catch (error) { next(error); }
}

export async function verifyMfa(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const input = parse(mfaCodeSchema, request.body); const challengeToken = request.body?.challengeToken; if (typeof challengeToken !== "string") throw new AppError(400, "MFA challenge token is required", "MFA_CHALLENGE_REQUIRED"); const result = await verifyUserMfa(challengeToken, input.code, metadata(request)); setAuthCookie(response, result.token); response.json({ user: result.user }); } catch (error) { next(error); }
}

export async function logout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { if (request.auth) await revokeUserSession(request.auth.userId, request.auth.sessionId, request.auth.tenantId); response.clearCookie(authCookieName, authCookieOptions); response.status(204).send(); } catch (error) { next(error); }
}

export async function currentUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); response.json({ user: await getPublicUser(request.auth.userId, request.auth.tenantId) }); } catch (error) { next(error); }
}

export async function updateCurrentUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); const input = parse(profileSchema, request.body); response.json({ user: await updateProfile(request.auth.userId, request.auth.tenantId, input) }); } catch (error) { next(error); }
}

export async function changePassword(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireUserAuth(request); const input = parse(passwordChangeSchema, request.body); await changeUserPassword(auth.userId, auth.tenantId, input.currentPassword, input.newPassword); response.clearCookie(authCookieName, authCookieOptions); response.status(204).send(); } catch (error) { next(error); } }

export async function startMfaSetup(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = requireUserAuth(request); response.json(await startUserMfaSetup(auth.userId, auth.tenantId, (await getPublicUser(auth.userId, auth.tenantId)).email)); } catch (error) { next(error); }
}

export async function enableMfa(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = requireUserAuth(request); const { code } = parse(mfaCodeSchema, request.body); response.json({ recoveryCodes: await enableUserMfa(auth.userId, auth.tenantId, code) }); } catch (error) { next(error); }
}

export async function disableMfa(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = requireUserAuth(request); const { code } = parse(mfaCodeSchema, request.body); await disableUserMfa(auth.userId, auth.tenantId, code); response.status(204).send(); } catch (error) { next(error); }
}

export async function sessions(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = requireUserAuth(request); response.json({ sessions: await listUserSessions(auth.userId, auth.sessionId) }); } catch (error) { next(error); }
}

export async function revokeSession(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = requireUserAuth(request); const { sessionId } = parse(sessionSchema, request.body); await revokeUserSession(auth.userId, sessionId, auth.tenantId); response.status(204).send(); } catch (error) { next(error); }
}

export async function forceLogout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = requireUserAuth(request); await revokeTokens(auth.userId, auth.tenantId); response.clearCookie(authCookieName, authCookieOptions); response.status(204).send(); } catch (error) { next(error); }
}

export async function forgotPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const { email } = parse(forgotPasswordSchema, request.body); const resetToken = await requestPasswordReset(email); const body: { message: string; resetToken?: string } = { message: "If an account exists for that email, reset instructions have been prepared." }; if (envIsDevelopment() && resetToken) body.resetToken = resetToken; response.json(body); } catch (error) { next(error); }
}

export async function resetPasswordController(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const input = parse(resetPasswordSchema, request.body); await resetPassword(input.token, input.password); response.json({ message: "Password reset successfully. Please log in again." }); } catch (error) { next(error); }
}

function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> { const result = schema.safeParse(value); if (!result.success) throw new AppError(400, result.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR"); return result.data; }
function setAuthCookie(response: Response, token: string): void { response.cookie(authCookieName, token, { ...authCookieOptions, maxAge: 24 * 60 * 60 * 1000 }); }
function envIsDevelopment(): boolean { return process.env.NODE_ENV !== "production"; }
function metadata(request: Request) { return { userAgent: request.get("user-agent") ?? undefined, ipAddress: request.ip }; }
function requireUserAuth(request: Request) { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); return request.auth; }
