import type { Request, Response } from "express";

export function getDashboard(_request: Request, response: Response): void {
  response.json({
    metrics: null,
    recentActivity: [],
    sources: [],
    investigationTrends: [],
    threatOverview: [],
  });
}
