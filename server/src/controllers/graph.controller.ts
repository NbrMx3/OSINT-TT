import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { EntityType, RoleName } from "@prisma/client";
import { AppError } from "../utils/appError";
import { correlateInvestigation, createEntity, createRelationship, listGraph, listLayouts, saveLayout } from "../services/graph.service";

const entitySchema = z.object({ type: z.nativeEnum(EntityType), value: z.string().trim().min(1).max(2048), name: z.string().trim().max(200).optional(), metadata: z.record(z.string(), z.unknown()).optional(), investigationId: z.string().max(64).optional() });
const relationshipSchema = z.object({ fromEntityId: z.string().min(1), toEntityId: z.string().min(1), type: z.string().trim().min(2).max(100), confidence: z.number().min(0).max(1), sourceReferences: z.array(z.unknown()).optional(), evidenceQuality: z.number().min(0).max(1).optional(), corroborationScore: z.number().min(0).max(1).optional(), freshnessScore: z.number().min(0).max(1).optional(), metadata: z.record(z.string(), z.unknown()).optional(), investigationId: z.string().max(64).optional() });
const layoutSchema = z.object({ name: z.string().trim().min(1).max(120), investigationId: z.string().max(64).optional(), nodes: z.array(z.unknown()), edges: z.array(z.unknown()) });

function assertAuth(request: Request) { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); return request.auth; }
function assertRole(request: Request) { const auth = assertAuth(request); if (auth.role !== RoleName.ADMINISTRATOR && auth.role !== RoleName.ANALYST && auth.role !== RoleName.INVESTIGATOR) throw new AppError(403, "Graph analysis requires an investigator role", "GRAPH_ROLE_REQUIRED"); return auth; }

export async function graph(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = assertRole(request); const type = typeof request.query.type === "string" && Object.values(EntityType).includes(request.query.type as EntityType) ? request.query.type as EntityType : undefined; response.json(await listGraph(auth.tenantId, typeof request.query.investigationId === "string" ? request.query.investigationId : undefined, type)); } catch (error) { next(error); }
}
export async function correlate(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = assertRole(request); const investigationId = typeof request.body?.investigationId === "string" ? request.body.investigationId : undefined; response.status(201).json(await correlateInvestigation(auth.tenantId, investigationId)); } catch (error) { next(error); }
}
export async function entity(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = assertRole(request); const parsed = entitySchema.safeParse(request.body); if (!parsed.success) throw new AppError(400, "Invalid entity payload", "VALIDATION_ERROR"); response.status(201).json({ entity: await createEntity(auth.tenantId, parsed.data) }); } catch (error) { next(error); }
}
export async function relationship(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = assertRole(request); const parsed = relationshipSchema.safeParse(request.body); if (!parsed.success) throw new AppError(400, "Invalid relationship payload", "VALIDATION_ERROR"); const { investigationId, ...input } = parsed.data; response.status(201).json({ relationship: await createRelationship(auth.tenantId, investigationId, input) }); } catch (error) { next(error); }
}
export async function layouts(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const auth = assertRole(request); if (request.method === "GET") { response.json({ layouts: await listLayouts(auth.tenantId, typeof request.query.investigationId === "string" ? request.query.investigationId : undefined) }); return; } const parsed = layoutSchema.safeParse(request.body); if (!parsed.success) throw new AppError(400, "Invalid graph layout payload", "VALIDATION_ERROR"); response.status(201).json({ layout: await saveLayout(auth.tenantId, parsed.data) }); } catch (error) { next(error); }
}
