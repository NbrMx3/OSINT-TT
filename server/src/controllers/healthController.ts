import type { NextFunction, Request, Response } from "express";
import { verifyDatabaseConnection } from "../config/database";
import { getSystemHealth } from "../services/healthCenter.service";
import { AppError } from "../utils/appError";

export async function getHealth(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await verifyDatabaseConnection();
    response.json({
      status: "ok",
      service: "osint-x-api",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function getSystemHealthCenter(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    response.json(await getSystemHealth(request.auth.tenantId));
  } catch (error) { next(error); }
}
