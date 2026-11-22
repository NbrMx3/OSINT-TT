import type { Response, Request } from "express";
import { prisma } from "../config/prisma";
import { verifyDatabaseConnection } from "../config/database";

export async function streamRealtime(request: Request, response: Response, tenantId: string): Promise<void> {
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();

  let stopped = false;
  const send = (event: string, data: unknown) => {
    if (!stopped && !response.writableEnded) response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const publish = async () => {
    try {
      const [investigations, jobs, sources, activity] = await Promise.all([
        prisma.investigation.findMany({ where: { tenantId }, select: { id: true, name: true, status: true, progress: true, failureReason: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
        prisma.investigationJob.findMany({ where: { investigation: { tenantId } }, select: { id: true, investigationId: true, status: true, progress: true, currentStage: true, errorMessage: true, queuedAt: true, startedAt: true, completedAt: true }, orderBy: { queuedAt: "desc" }, take: 100 }),
        prisma.intelligenceSource.findMany({ where: { tenantId }, select: { id: true, name: true, type: true, status: true, lastSyncAt: true }, orderBy: { updatedAt: "desc" } }),
        prisma.activityLog.findMany({ where: { tenantId }, select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
      ]);
      await verifyDatabaseConnection();
      send("snapshot", {
        timestamp: new Date().toISOString(),
        health: { status: "ok", database: "connected" },
        investigations,
        jobs,
        sources,
        notifications: activity.map((item) => ({ id: item.id, title: item.action.replace(/_/g, " "), description: item.user?.name ? `Updated by ${item.user.name}` : "Workspace activity", timestamp: item.createdAt.toISOString(), severity: item.action.includes("FAILED") ? "critical" : item.action.includes("COMPLETED") ? "success" : "info" })),
      });
    } catch {
      send("snapshot", { timestamp: new Date().toISOString(), health: { status: "degraded", database: "disconnected" }, investigations: [], jobs: [], sources: [], notifications: [] });
    }
  };

  await publish();
  const interval = setInterval(() => void publish(), 2000);
  const heartbeat = setInterval(() => send("heartbeat", { timestamp: new Date().toISOString() }), 15000);
  request.on("close", () => { stopped = true; clearInterval(interval); clearInterval(heartbeat); });
}
