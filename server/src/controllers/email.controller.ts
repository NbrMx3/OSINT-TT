import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { getEmailResult, investigateEmail, listEmailHistory } from "../services/email.service";

const investigateSchema = z.object({
  email: z.string().trim().email().max(254),
  investigationId: z.string().max(64).optional(),
  checkBreachExposure: z.boolean().default(false),
  searchPublicReferences: z.boolean().default(false),
});

export async function investigate(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const input = investigateSchema.safeParse(request.body);
    if (!input.success) throw new AppError(400, input.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    response.status(202).json(await investigateEmail({ ...input.data, tenantId: request.auth.tenantId, userId: request.auth.userId, role: request.auth.role }));
  } catch (error) { next(error); }
}

export async function result(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    response.json({ result: await getEmailResult(String(request.params.id), request.auth.tenantId) });
  } catch (error) { next(error); }
}

export async function history(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const email = typeof request.query.email === "string" ? request.query.email : undefined;
    response.json({ history: await listEmailHistory(request.auth.tenantId, email) });
  } catch (error) { next(error); }
}
