import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { createSavedDashboard, deleteSavedDashboard, listSavedDashboards, updateSavedDashboard } from "../services/dashboardCustomization.service";

const dashboardSchema = z.object({ name: z.string().trim().min(1).max(100), layout: z.array(z.string()).min(1).max(20), filters: z.record(z.string(), z.unknown()).optional(), isPinned: z.boolean().optional() });
function auth(request: Request) { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); return request.auth; }
export async function list(request: Request, response: Response, next: NextFunction): Promise<void> { try { const current = auth(request); response.json({ dashboards: await listSavedDashboards(current.tenantId, current.userId) }); } catch (error) { next(error); } }
export async function create(request: Request, response: Response, next: NextFunction): Promise<void> { try { const current = auth(request); const parsed = dashboardSchema.safeParse(request.body); if (!parsed.success) throw new AppError(400, parsed.error.issues.map((item) => item.message).join("; "), "VALIDATION_ERROR"); response.status(201).json({ dashboard: await createSavedDashboard(current.tenantId, current.userId, parsed.data) }); } catch (error) { next(error); } }
export async function update(request: Request, response: Response, next: NextFunction): Promise<void> { try { const current = auth(request); const parsed = dashboardSchema.partial().safeParse(request.body); if (!parsed.success) throw new AppError(400, parsed.error.issues.map((item) => item.message).join("; "), "VALIDATION_ERROR"); response.json({ dashboard: await updateSavedDashboard(String(request.params.id), current.tenantId, current.userId, parsed.data) }); } catch (error) { next(error); } }
export async function remove(request: Request, response: Response, next: NextFunction): Promise<void> { try { const current = auth(request); await deleteSavedDashboard(String(request.params.id), current.tenantId, current.userId); response.status(204).send(); } catch (error) { next(error); } }
