import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { authCookieName, authCookieOptions, getPublicUser, loginUser, registerUser, requestPasswordReset, resetPassword, revokeTokens, updateProfile } from "../services/authService";

const strongPassword = z.string().min(8).max(128).regex(/[A-Z]/, "Password must include an uppercase letter").regex(/[a-z]/, "Password must include a lowercase letter").regex(/[0-9]/, "Password must include a number");
const registrationSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), password: strongPassword, organizationName: z.string().trim().max(120).optional() });
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(254) });
const resetPasswordSchema = z.object({ token: z.string().min(32).max(128), password: strongPassword });
const profileSchema = z.object({ name: z.string().trim().min(2).max(100) });

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const input = parse(registrationSchema, request.body); const result = await registerUser(input); setAuthCookie(response, result.token); response.status(201).json({ user: result.user }); } catch (error) { next(error); }
}

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const input = parse(loginSchema, request.body); const result = await loginUser(input); setAuthCookie(response, result.token); response.json({ user: result.user }); } catch (error) { next(error); }
}

export async function logout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { if (request.auth) await revokeTokens(request.auth.userId, request.auth.tenantId); response.clearCookie(authCookieName, authCookieOptions); response.status(204).send(); } catch (error) { next(error); }
}

export async function currentUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); response.json({ user: await getPublicUser(request.auth.userId, request.auth.tenantId) }); } catch (error) { next(error); }
}

export async function updateCurrentUser(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); const input = parse(profileSchema, request.body); response.json({ user: await updateProfile(request.auth.userId, request.auth.tenantId, input) }); } catch (error) { next(error); }
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
