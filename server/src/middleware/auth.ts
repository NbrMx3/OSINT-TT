import type { NextFunction, Request, Response } from "express";
import { RoleName } from "@prisma/client";
import { AppError } from "../utils/appError";
import { verifyAccessToken } from "../services/authService";

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

function getToken(request: Request): string | undefined {
  const cookieToken = request.cookies?.osintx_token as string | undefined;
  if (cookieToken) return cookieToken;
  const authorization = request.header("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return undefined;
}
