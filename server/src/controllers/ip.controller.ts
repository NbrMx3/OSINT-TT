import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { getIpResult, investigateIp, listIpHistory } from "../services/ip.service";

const investigateSchema = z.object({ ip: z.string().trim().min(2).max(64), investigationId: z.string().max(64).optional() });

export async function investigate(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const input = investigateSchema.safeParse(request.body);
    if (!input.success) throw new AppError(400, input.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    response.status(202).json(await investigateIp({ ...input.data, tenantId: request.auth.tenantId, userId: request.auth.userId }));
  } catch (error) { next(error); }
}

export async function result(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    response.json({ result: await getIpResult(String(request.params.id), request.auth.tenantId) });
  } catch (error) { next(error); }
}

export async function history(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const ip = typeof request.query.ip === "string" ? request.query.ip : undefined;
    response.json({ history: await listIpHistory(request.auth.tenantId, ip) });
  } catch (error) { next(error); }
}
