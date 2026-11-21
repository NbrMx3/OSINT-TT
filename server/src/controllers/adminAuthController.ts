import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { adminAuthCookieName, adminAuthCookieOptions, getPublicAdmin, loginAdmin, revokeAdminToken } from "../services/adminAuthService";

const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });

export async function adminLogin(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = parse(loginSchema, request.body);
    const result = await loginAdmin(input);
    response.cookie(adminAuthCookieName, result.token, { ...adminAuthCookieOptions, maxAge: 24 * 60 * 60 * 1000 });
    response.json({ admin: result.admin });
  } catch (error) { next(error); }
}

export async function adminLogout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (request.adminAuth) await revokeAdminToken(request.adminAuth.adminId);
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

function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, result.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
  return result.data;
}
