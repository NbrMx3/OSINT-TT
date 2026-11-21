import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { appendAuditLog } from "../services/auditService";

export const auditRequest: RequestHandler = (request, response, next) => {
  const requestId = request.header("x-request-id")?.trim() || crypto.randomUUID();
  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);

  response.on("finish", () => {
    if (!request.path.startsWith("/api") && !request.originalUrl.startsWith("/api")) return;
    if (request.originalUrl === "/api/health") return;

    const action = classifyAction(request);
    void appendAuditLog({
      tenantId: request.auth?.tenantId,
      userId: request.auth?.userId,
      action,
      entityType: "APIRequest",
      entityId: request.requestId,
      metadata: {
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        outcome: response.statusCode >= 400 ? "failure" : "success",
      },
      ipAddress: request.ip || request.socket.remoteAddress || undefined,
      userAgent: request.get("user-agent") ?? undefined,
      requestId,
    }).catch((error: unknown) => {
      console.error("Unable to append audit log:", error instanceof Error ? error.message : error);
    });
  });

  next();
};

function classifyAction(request: Parameters<RequestHandler>[0]): string {
  const path = request.originalUrl.split("?")[0].toLowerCase();
  if (path.includes("/auth/login") || path.endsWith("/login")) return "AUTH_LOGIN";
  if (path.includes("/auth/logout") || path.endsWith("/logout")) return "AUTH_LOGOUT";
  if (path.includes("/export") || path.endsWith("/pdf")) return "EXPORT";
  if (request.method === "DELETE") return "DELETE";
  if (request.method === "PATCH" || request.method === "PUT") return "EDIT";
  if (path.includes("/intelligence") || path.includes("/search") || path.includes("/correlate")) return "SEARCH";
  if (path.startsWith("/api/admin") || request.adminAuth) return "ADMIN_ACTION";
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") return "API_MUTATION";
  return "API_CALL";
}
