import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function listTenantUsers(request: Request, response: Response): Promise<void> {
  const users = await prisma.user.findMany({ where: { tenantId: request.auth?.tenantId }, select: { id: true, name: true, email: true, isActive: true, createdAt: true, role: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  response.json({ users });
}
