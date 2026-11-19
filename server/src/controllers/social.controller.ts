import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getSocialResult, investigateSocial, listSocialHistory } from "../services/social.service";
import { AppError } from "../utils/appError";

const investigateSchema = z.object({
  username: z.string().trim().min(1).max(51),
  investigationId: z.string().max(64).optional(),
  platforms: z.array(z.enum(["github", "reddit", "youtube"])).min(1).max(3).default(["github", "reddit", "youtube"]),
});

export async function investigate(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const input = investigateSchema.safeParse(request.body);
    if (!input.success) throw new AppError(400, input.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    response.status(202).json(await investigateSocial({ ...input.data, tenantId: request.auth.tenantId, userId: request.auth.userId, role: request.auth.role }));
  } catch (error) { next(error); }
}

export async function result(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    response.json({ result: await getSocialResult(String(request.params.id), request.auth.tenantId) });
  } catch (error) { next(error); }
}

export async function history(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const username = typeof request.query.username === "string" ? request.query.username : undefined;
    response.json({ history: await listSocialHistory(request.auth.tenantId, username) });
  } catch (error) { next(error); }
}
