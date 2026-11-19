import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ReportStatus } from "@prisma/client";
import { AppError } from "../utils/appError";
import { deleteReport, exportReport, generateReport, getReport, getReportPdf, listReports } from "../services/report.service";

const generationSchema = z.object({ investigationId: z.string().min(1), title: z.string().trim().max(200).optional() });

function auth(request: Request) { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); return request.auth; }

export async function create(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const current = auth(request); const parsed = generationSchema.safeParse(request.body); if (!parsed.success) throw new AppError(400, "Investigation ID is required", "VALIDATION_ERROR"); response.status(201).json({ report: await generateReport({ ...parsed.data, tenantId: current.tenantId, authorId: current.userId }) }); } catch (error) { next(error); }
}
export async function list(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { const current = auth(request); const status = typeof request.query.status === "string" && Object.values(ReportStatus).includes(request.query.status as ReportStatus) ? request.query.status as ReportStatus : undefined; response.json({ reports: await listReports(current.tenantId, { search: typeof request.query.search === "string" ? request.query.search : undefined, status, investigationId: typeof request.query.investigationId === "string" ? request.query.investigationId : undefined }) }); } catch (error) { next(error); }
}
export async function detail(request: Request, response: Response, next: NextFunction): Promise<void> { try { response.json({ report: await getReport(auth(request).tenantId, String(request.params.id)) }); } catch (error) { next(error); } }
export async function pdf(request: Request, response: Response, next: NextFunction): Promise<void> { try { const report = await getReportPdf(auth(request).tenantId, String(request.params.id)); response.type("application/pdf").attachment(`${safeFilename(report.title)}.pdf`).send(report.pdfData); } catch (error) { next(error); } }
export async function exportData(request: Request, response: Response, next: NextFunction): Promise<void> { try { const format = request.query.format === "csv" ? "csv" : "json"; const file = await exportReport(auth(request).tenantId, String(request.params.id), format); response.type(file.contentType).attachment(file.filename).send(file.body); } catch (error) { next(error); } }
export async function remove(request: Request, response: Response, next: NextFunction): Promise<void> { try { await deleteReport(auth(request).tenantId, String(request.params.id)); response.status(204).send(); } catch (error) { next(error); } }
function safeFilename(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "osint-x-report"; }
