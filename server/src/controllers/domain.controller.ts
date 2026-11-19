import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { investigateDomain, getDomainResult, listDomainHistory } from "../services/domain.service";
import { AppError } from "../utils/appError";

const investigateSchema = z.object({ domain: z.string().trim().min(1).max(253), investigationId: z.string().optional() });

export async function investigate(request: Request, response: Response, next: NextFunction): Promise<void> { try { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); const input = investigateSchema.safeParse(request.body); if (!input.success) throw new AppError(400, input.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR"); response.status(202).json(await investigateDomain({ ...input.data, tenantId: request.auth.tenantId, userId: request.auth.userId })); } catch (error) { next(error); } }
export async function result(request: Request, response: Response, next: NextFunction): Promise<void> { try { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); response.json({ result: await getDomainResult(String(request.params.id), request.auth.tenantId) }); } catch (error) { next(error); } }
export async function history(request: Request, response: Response, next: NextFunction): Promise<void> { try { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); const domain = typeof request.query.domain === "string" ? request.query.domain : undefined; response.json({ history: await listDomainHistory(request.auth.tenantId, domain) }); } catch (error) { next(error); } }
