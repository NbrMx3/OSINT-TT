import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { getUsernameResult, investigateUsername, listUsernameHistory } from "../services/username.service";

const investigateSchema = z.object({
  username: z.string().trim().min(1).max(40),
  investigationId: z.string().max(64).optional(),
  platforms: z.array(z.enum(["github", "reddit"])).min(1).max(2).default(["github", "reddit"]),
});

export async function investigate(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const input = investigateSchema.safeParse(request.body);
    if (!input.success) throw new AppError(400, input.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    response.status(202).json(await investigateUsername({ ...input.data, tenantId: request.auth.tenantId, userId: request.auth.userId, role: request.auth.role }));
  } catch (error) { next(error); }
}

export async function result(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    response.json({ result: await getUsernameResult(String(request.params.id), request.auth.tenantId) });
  } catch (error) { next(error); }
}

export async function history(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const username = typeof request.query.username === "string" ? request.query.username : undefined;
    response.json({ history: await listUsernameHistory(request.auth.tenantId, username) });
  } catch (error) { next(error); }
}
