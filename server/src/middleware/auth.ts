import type { NextFunction, Request, Response } from "express";
import { RoleName } from "@prisma/client";
import { AppError } from "../utils/appError";
import { verifyAccessToken } from "../services/authService";
import { verifyAdminAccessToken } from "../services/adminAuthService";
import type { PermissionCode } from "../config/permissions";

export async function requireAuth(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const token = getToken(request);
    if (!token) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    request.auth = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const token = getToken(request);
    if (token) request.auth = await verifyAccessToken(token);
    next();
  } catch {
    next();
  }
}

export function authorizeRoles(...roles: RoleName[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth) return next(new AppError(401, "Authentication required", "AUTH_REQUIRED"));
    if (!roles.includes(request.auth.role)) return next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));
    next();
  };
}

export function authorizePermissions(...permissions: PermissionCode[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth) return next(new AppError(401, "Authentication required", "AUTH_REQUIRED"));
    if (!permissions.some((permission) => request.auth?.permissions.includes(permission))) return next(new AppError(403, "You do not have permission to perform this action", "PERMISSION_DENIED"));
    next();
  };
}

export async function requireAdminAuth(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const token = request.cookies?.osintx_admin_token as string | undefined ?? getBearerToken(request);
    if (!token) throw new AppError(401, "Administrator authentication required", "ADMIN_AUTH_REQUIRED");
    request.adminAuth = await verifyAdminAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

function getToken(request: Request): string | undefined {
  const cookieToken = request.cookies?.osintx_token as string | undefined;
  if (cookieToken) return cookieToken;
  return getBearerToken(request);
}

function getBearerToken(request: Request): string | undefined {
  const authorization = request.header("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}
