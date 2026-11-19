import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { investigateWebsite, getWebsiteResult, listWebsiteHistory } from "../services/website.service";
import { AppError } from "../utils/appError";

const investigateSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  investigationId: z.string().max(64).optional(),
});

export async function investigate(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const input = investigateSchema.safeParse(request.body);
    if (!input.success) throw new AppError(400, input.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    response.status(202).json(await investigateWebsite({ ...input.data, tenantId: request.auth.tenantId, userId: request.auth.userId, role: request.auth.role }));
  } catch (error) { next(error); }
}

export async function result(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    response.json({ result: await getWebsiteResult(String(request.params.id), request.auth.tenantId) });
  } catch (error) { next(error); }
}

export async function history(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const url = typeof request.query.url === "string" ? request.query.url : undefined;
    response.json({ history: await listWebsiteHistory(request.auth.tenantId, url) });
  } catch (error) { next(error); }
}
