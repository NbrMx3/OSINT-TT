import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { adminAuthCookieName, adminAuthCookieOptions, changeAdminPassword, disableAdminMfa, enableAdminMfa, getPublicAdmin, listAdminSessions, loginAdmin, revokeAdminSession, revokeAdminToken, startAdminMfaSetup, verifyAdminMfa } from "../services/adminAuthService";

const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
const mfaCodeSchema = z.object({ code: z.string().trim().min(6).max(32) });
const sessionSchema = z.object({ sessionId: z.string().min(10).max(100) });
const passwordChangeSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(12).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/) });

export async function adminLogin(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = parse(loginSchema, request.body);
    const result = await loginAdmin(input, metadata(request));
    if ("mfaRequired" in result) { response.json(result); return; }
    response.cookie(adminAuthCookieName, result.token, { ...adminAuthCookieOptions, maxAge: 24 * 60 * 60 * 1000 });
    response.json({ admin: result.admin });
  } catch (error) { next(error); }
}

export async function adminMfaVerify(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const input = parse(mfaCodeSchema, request.body); const challengeToken = request.body?.challengeToken; if (typeof challengeToken !== "string") throw new AppError(400, "MFA challenge token is required", "MFA_CHALLENGE_REQUIRED"); const result = await verifyAdminMfa(challengeToken, input.code, metadata(request)); setAdminCookie(response, result.token); response.json({ admin: result.admin }); } catch (error) { next(error); }
}

export async function adminLogout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (request.adminAuth) await revokeAdminSession(request.adminAuth.adminId, request.adminAuth.sessionId);
    response.clearCookie(adminAuthCookieName, adminAuthCookieOptions);
    response.status(204).send();
  } catch (error) { next(error); }
}

export async function currentAdmin(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.adminAuth) throw new AppError(401, "Administrator authentication required", "ADMIN_AUTH_REQUIRED");
    response.json({ admin: await getPublicAdmin(request.adminAuth.adminId) });
  } catch (error) { next(error); }
}

export async function startAdminMfa(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAdminAuth(request); const admin = await getPublicAdmin(auth.adminId); response.json(await startAdminMfaSetup(auth.adminId, admin.email)); } catch (error) { next(error); } }
export async function enableAdminMfaController(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAdminAuth(request); const { code } = parse(mfaCodeSchema, request.body); response.json({ recoveryCodes: await enableAdminMfa(auth.adminId, code) }); } catch (error) { next(error); } }
export async function disableAdminMfaController(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAdminAuth(request); const { code } = parse(mfaCodeSchema, request.body); await disableAdminMfa(auth.adminId, code); response.status(204).send(); } catch (error) { next(error); } }
export async function adminSessions(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAdminAuth(request); response.json({ sessions: await listAdminSessions(auth.adminId, auth.sessionId) }); } catch (error) { next(error); } }
export async function revokeAdminSessionController(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAdminAuth(request); const { sessionId } = parse(sessionSchema, request.body); await revokeAdminSession(auth.adminId, sessionId); response.status(204).send(); } catch (error) { next(error); } }
export async function forceAdminLogout(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAdminAuth(request); await revokeAdminToken(auth.adminId); response.clearCookie(adminAuthCookieName, adminAuthCookieOptions); response.status(204).send(); } catch (error) { next(error); } }
export async function changeAdminPasswordController(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAdminAuth(request); const input = parse(passwordChangeSchema, request.body); await changeAdminPassword(auth.adminId, input.currentPassword, input.newPassword); response.clearCookie(adminAuthCookieName, adminAuthCookieOptions); response.status(204).send(); } catch (error) { next(error); } }

function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, result.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
  return result.data;
}

function setAdminCookie(response: Response, token: string): void { response.cookie(adminAuthCookieName, token, { ...adminAuthCookieOptions, maxAge: 24 * 60 * 60 * 1000 }); }
function metadata(request: Request) { return { userAgent: request.get("user-agent") ?? undefined, ipAddress: request.ip }; }
function requireAdminAuth(request: Request) { if (!request.adminAuth) throw new AppError(401, "Administrator authentication required", "ADMIN_AUTH_REQUIRED"); return request.adminAuth; }
