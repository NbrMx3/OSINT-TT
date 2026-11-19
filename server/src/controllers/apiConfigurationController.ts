import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { encryptSecret } from "../utils/secretCrypto";

const configurationSchema = z.object({ name: z.string().trim().min(2).max(100), provider: z.string().trim().min(2).max(80), config: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, "Configuration cannot be empty") });

export async function listConfigurations(request: Request, response: Response): Promise<void> {
  const configurations = await prisma.apiConfiguration.findMany({ where: { tenantId: request.auth?.tenantId }, select: { id: true, name: true, provider: true, isActive: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" } });
  response.json({ configurations });
}

export async function createConfiguration(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    const parsed = configurationSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError(400, parsed.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
    const configuration = await prisma.apiConfiguration.create({ data: { tenantId: request.auth.tenantId, ownerId: request.auth.userId, name: parsed.data.name, provider: parsed.data.provider, encryptedConfig: encryptSecret(JSON.stringify(parsed.data.config)) }, select: { id: true, name: true, provider: true, isActive: true, createdAt: true } });
    response.status(201).json({ configuration });
  } catch (error) { next(error); }
}
