import type { Request, Response } from "express";
import { RoleName } from "@prisma/client";
import { getAnalytics } from "../services/analytics.service";

export async function getDashboard(request: Request, response: Response): Promise<void> {
  const auth = request.auth; const requestedTenant = typeof request.query.tenantId === "string" ? request.query.tenantId : undefined; const tenantId = auth?.role === RoleName.ADMINISTRATOR && requestedTenant ? requestedTenant : auth?.tenantId ?? ""; response.json(await getAnalytics(auth?.tenantId ?? "", { tenantId, from: typeof request.query.from === "string" ? request.query.from : undefined, to: typeof request.query.to === "string" ? request.query.to : undefined }));
}
