import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";

export type SearchType = "USER" | "INVESTIGATION" | "ENTITY" | "FINDING" | "REPORT" | "EVIDENCE";
export interface GlobalSearchInput { q?: string; type?: SearchType; status?: string; investigationId?: string; severity?: string; sort?: "UPDATED_DESC" | "UPDATED_ASC" | "CREATED_DESC" | "CREATED_ASC" | "NAME_ASC"; limit?: number }

export async function globalSearch(tenantId: string, input: GlobalSearchInput) {
  const term = input.q?.trim() ?? "";
  const limit = Math.min(input.limit ?? 50, 100);
  const types = input.type ? [input.type] : ["USER", "INVESTIGATION", "ENTITY", "FINDING", "REPORT", "EVIDENCE"] as SearchType[];
  const results: Array<{ id: string; type: SearchType; title: string; subtitle: string | null; status: string | null; url: string; updatedAt: Date; createdAt: Date }> = [];
  const text = term.length ? { contains: term, mode: "insensitive" as const } : undefined;

  if (types.includes("USER")) {
    const rows = await prisma.user.findMany({ where: { tenantId, ...(term ? { OR: [{ name: text! }, { email: text! }] } : {}) }, take: limit, orderBy: { updatedAt: "desc" } });
    results.push(...rows.map((row) => ({ id: row.id, type: "USER" as const, title: row.name, subtitle: row.email, status: row.isActive ? "ACTIVE" : "INACTIVE", url: "/users", updatedAt: row.updatedAt, createdAt: row.createdAt })));
  }
  if (types.includes("INVESTIGATION")) {
    const rows = await prisma.investigation.findMany({ where: { tenantId, ...(term ? { OR: [{ name: text! }, { description: text! }, { id: text! }] } : {}), ...(input.status ? { status: input.status as never } : {}) }, take: limit, orderBy: { updatedAt: "desc" } });
    results.push(...rows.map((row) => ({ id: row.id, type: "INVESTIGATION" as const, title: row.name, subtitle: row.description, status: row.status, url: `/investigations/${row.id}`, updatedAt: row.updatedAt, createdAt: row.createdAt })));
  }
  if (types.includes("ENTITY")) {
    const rows = await prisma.entity.findMany({ where: { tenantId, ...(input.investigationId ? { investigationId: input.investigationId } : {}), ...(term ? { OR: [{ value: text! }, { name: text! }] } : {}) }, take: limit, orderBy: { updatedAt: "desc" } });
    results.push(...rows.map((row) => ({ id: row.id, type: "ENTITY" as const, title: row.name || row.value, subtitle: `${row.type} · ${row.value}`, status: row.type, url: `/graph?entity=${row.id}`, updatedAt: row.updatedAt, createdAt: row.createdAt })));
  }
  if (types.includes("FINDING")) {
    const rows = await prisma.finding.findMany({ where: { tenantId, ...(input.investigationId ? { investigationId: input.investigationId } : {}), ...(input.status ? { status: input.status as never } : {}), ...(input.severity ? { severity: input.severity as never } : {}), ...(term ? { OR: [{ title: text! }, { description: text! }] } : {}) }, take: limit, orderBy: { updatedAt: "desc" } });
    results.push(...rows.map((row) => ({ id: row.id, type: "FINDING" as const, title: row.title, subtitle: row.description, status: `${row.severity} · ${row.status}`, url: row.investigationId ? `/investigations/${row.investigationId}/results` : "/investigations", updatedAt: row.updatedAt, createdAt: row.createdAt })));
  }
  if (types.includes("REPORT")) {
    const rows = await prisma.report.findMany({ where: { tenantId, ...(input.status ? { status: input.status as never } : {}), ...(input.investigationId ? { investigationId: input.investigationId } : {}), ...(term ? { OR: [{ title: text! }, { searchText: text! }] } : {}) }, take: limit, orderBy: { updatedAt: "desc" } });
    results.push(...rows.map((row) => ({ id: row.id, type: "REPORT" as const, title: row.title, subtitle: row.searchText, status: row.status, url: `/reports`, updatedAt: row.updatedAt, createdAt: row.createdAt })));
  }
  if (types.includes("EVIDENCE")) {
    const rows = await prisma.evidence.findMany({ where: { tenantId, ...(input.investigationId ? { investigationId: input.investigationId } : {}), ...(term ? { OR: [{ title: text! }, { sourceUrl: text! }, { contentHash: text! }, { storageKey: text! }] } : {}) }, take: limit, orderBy: { collectedAt: "desc" } });
    results.push(...rows.map((row) => ({ id: row.id, type: "EVIDENCE" as const, title: row.title || "Evidence record", subtitle: row.sourceUrl || row.contentHash, status: row.findingId ? "LINKED" : "UNLINKED", url: row.investigationId ? `/investigations/${row.investigationId}/results` : "/investigations", updatedAt: row.collectedAt, createdAt: row.collectedAt })));
  }

  const sorted = [...results].sort((a, b) => {
    if (input.sort === "NAME_ASC") return a.title.localeCompare(b.title);
    if (input.sort === "UPDATED_ASC") return a.updatedAt.getTime() - b.updatedAt.getTime();
    if (input.sort === "CREATED_ASC") return a.createdAt.getTime() - b.createdAt.getTime();
    if (input.sort === "CREATED_DESC") return b.createdAt.getTime() - a.createdAt.getTime();
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  }).slice(0, limit);
  return { query: term, total: sorted.length, results: sorted.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString(), createdAt: row.createdAt.toISOString() })) };
}

export async function listSavedSearches(tenantId: string, userId: string) { return prisma.savedSearch.findMany({ where: { tenantId, userId }, orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }] }); }
export async function createSavedSearch(tenantId: string, userId: string, input: { name: string; query?: string; filters?: Record<string, unknown>; sort?: string; isPinned?: boolean }) { return prisma.savedSearch.create({ data: { tenantId, userId, name: input.name, query: input.query, filters: input.filters as Prisma.InputJsonValue | undefined, sort: input.sort ?? "UPDATED_DESC", isPinned: input.isPinned ?? false } }); }
export async function updateSavedSearch(id: string, tenantId: string, userId: string, input: { name?: string; query?: string; filters?: Record<string, unknown>; sort?: string; isPinned?: boolean }) { const existing = await prisma.savedSearch.findFirst({ where: { id, tenantId, userId } }); if (!existing) throw new AppError(404, "Saved search not found", "SAVED_SEARCH_NOT_FOUND"); return prisma.savedSearch.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.query !== undefined ? { query: input.query } : {}), ...(input.filters !== undefined ? { filters: input.filters as Prisma.InputJsonValue } : {}), ...(input.sort !== undefined ? { sort: input.sort } : {}), ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}) } }); }
export async function deleteSavedSearch(id: string, tenantId: string, userId: string) { const existing = await prisma.savedSearch.findFirst({ where: { id, tenantId, userId } }); if (!existing) throw new AppError(404, "Saved search not found", "SAVED_SEARCH_NOT_FOUND"); await prisma.savedSearch.delete({ where: { id } }); }
