import type { Request, Response } from "express";
import { getAnalytics } from "../services/analytics.service";

export async function getDashboard(request: Request, response: Response): Promise<void> {
  response.json(await getAnalytics(request.auth?.tenantId ?? ""));
}
