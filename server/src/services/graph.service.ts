import { EntityType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";

type EntityInput = { type: EntityType; value: string; name?: string; metadata?: Record<string, unknown>; investigationId?: string };
type RelationshipInput = { fromEntityId: string; toEntityId: string; type: string; confidence: number; sourceReferences?: unknown[]; evidenceQuality?: number; corroborationScore?: number; freshnessScore?: number; metadata?: Record<string, unknown> };

export async function listGraph(tenantId: string, investigationId?: string, type?: EntityType) {
  const entities = await prisma.entity.findMany({
    where: { tenantId, ...(investigationId ? { investigationId } : {}), ...(type ? { type } : {}) },
    include: { findings: { select: { id: true, title: true, severity: true } }, relationshipsFrom: { include: { toEntity: true, evidence: true } }, relationshipsTo: { include: { fromEntity: true, evidence: true } } },
    orderBy: { updatedAt: "desc" }, take: 1000,
  });
  const entityIds = new Set(entities.map((entity) => entity.id));
  const relationships = await prisma.relationship.findMany({
    where: { tenantId, ...(investigationId ? { investigationId } : {}), fromEntityId: { in: [...entityIds] }, toEntityId: { in: [...entityIds] } },
    include: { fromEntity: true, toEntity: true, evidence: { select: { id: true, sourceUrl: true, title: true, contentHash: true, collectedAt: true } } },
    orderBy: { confidence: "desc" }, take: 2000,
  });
  return { entities, relationships };
}

export async function createEntity(tenantId: string, input: EntityInput) {
  const value = input.value.trim();
  if (!value || value.length > 2048) throw new AppError(400, "Entity value is required and must be 2048 characters or fewer", "INVALID_ENTITY");
  const existing = await prisma.entity.findFirst({ where: { tenantId, type: input.type, value }, orderBy: { createdAt: "asc" } });
  if (existing) {
    return prisma.entity.update({ where: { id: existing.id }, data: { name: input.name ?? existing.name, ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}), ...(input.investigationId ? { investigationId: input.investigationId } : {}) } });
  }
  return prisma.entity.create({ data: { tenantId, type: input.type, value, name: input.name, metadata: input.metadata as Prisma.InputJsonValue | undefined, investigationId: input.investigationId } });
}

export async function createRelationship(tenantId: string, investigationId: string | undefined, input: RelationshipInput) {
  if (input.fromEntityId === input.toEntityId) throw new AppError(400, "An entity cannot be related to itself", "INVALID_RELATIONSHIP");
  const entities = await prisma.entity.findMany({ where: { tenantId, id: { in: [input.fromEntityId, input.toEntityId] } }, select: { id: true } });
  if (entities.length !== 2) throw new AppError(404, "Both relationship entities must belong to this tenant", "ENTITY_NOT_FOUND");
  const confidence = clamp(input.confidence);
  const existing = await prisma.relationship.findFirst({ where: { tenantId, fromEntityId: input.fromEntityId, toEntityId: input.toEntityId, type: input.type } });
  if (existing) return prisma.relationship.update({ where: { id: existing.id }, data: relationshipData(input, confidence) });
  return prisma.relationship.create({ data: { tenantId, investigationId, ...relationshipData(input, confidence), evidence: { create: evidenceData(tenantId, input) } } });
}

export async function saveLayout(tenantId: string, input: { name: string; investigationId?: string; nodes: unknown; edges: unknown }) {
  if (!input.name.trim() || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) throw new AppError(400, "A layout name, nodes array, and edges array are required", "INVALID_GRAPH_LAYOUT");
  return prisma.graphLayout.create({ data: { tenantId, name: input.name.trim().slice(0, 120), investigationId: input.investigationId, nodes: input.nodes as Prisma.InputJsonValue, edges: input.edges as Prisma.InputJsonValue } });
}

export async function listLayouts(tenantId: string, investigationId?: string) {
  return prisma.graphLayout.findMany({ where: { tenantId, ...(investigationId ? { investigationId } : {}) }, orderBy: { updatedAt: "desc" }, take: 50 });
}

export async function correlateInvestigation(tenantId: string, investigationId?: string) {
  const scope = investigationId ? { investigationId } : {};
  const created: { entities: number; relationships: number } = { entities: 0, relationships: 0 };
  const entityCache = new Map<string, string>();
  const ensure = async (type: EntityType, value: string, metadata: Record<string, unknown>, source: string) => {
    const key = `${type}:${value.toLowerCase()}`;
    const cached = entityCache.get(key);
    if (cached) return cached;
    const entity = await createEntity(tenantId, { type, value, metadata, investigationId });
    entityCache.set(key, entity.id);
    if (entity.createdAt.getTime() === entity.updatedAt.getTime()) created.entities += 1;
    return entity.id;
  };
  const link = async (from: string, to: string, type: string, source: string, evidenceQuality = 0.7, freshnessScore = 0.8) => {
    const relationship = await createRelationship(tenantId, investigationId, { fromEntityId: from, toEntityId: to, type, confidence: confidenceScore(0.9, evidenceQuality, 0.5, freshnessScore), sourceReferences: [{ source, collectedAt: new Date().toISOString() }], evidenceQuality, corroborationScore: 0.5, freshnessScore, metadata: { attribution: source, identityWarning: "This relationship does not establish that entities belong to the same person or organisation." } });
    if (relationship.createdAt) created.relationships += 1;
  };

  const domains = await prisma.domainIntelligenceResult.findMany({ where: { tenantId, ...scope }, select: { domain: true, data: true, sourceReferences: true, investigationId: true } });
  for (const result of domains) {
    const domainId = await ensure(EntityType.DOMAIN, result.domain, {}, "Domain Intelligence");
    const data = record(result.data);
    for (const ip of strings(data.associatedIps)) {
      const ipId = await ensure(EntityType.IP, ip, {}, "Domain Intelligence");
      await link(domainId, ipId, "resolves_to", "Domain Intelligence");
    }
  }
  const ips = await prisma.ipIntelligenceResult.findMany({ where: { tenantId, ...scope }, select: { ip: true, data: true, investigationId: true } });
  for (const result of ips) {
    const ipId = await ensure(EntityType.IP, result.ip, {}, "IP Intelligence");
    const data = record(result.data);
    for (const domain of strings(data.associatedDomains)) {
      const domainId = await ensure(EntityType.DOMAIN, domain, {}, "IP Intelligence");
      await link(ipId, domainId, "associated_with", "IP Intelligence");
    }
    const asn = record(record(data.geolocation).data).asn;
    if (asn !== null && asn !== undefined) {
      const asnId = await ensure(EntityType.ASN, String(asn), {}, "IP Geolocation");
      await link(ipId, asnId, "announced_by", "IP Geolocation");
    }
  }
  const emails = await prisma.emailIntelligenceResult.findMany({ where: { tenantId, ...scope }, select: { email: true, data: true } });
  for (const result of emails) {
    const emailId = await ensure(EntityType.EMAIL, result.email, {}, "Email Intelligence");
    const domain = result.email.split("@")[1];
    if (domain) await link(emailId, await ensure(EntityType.DOMAIN, domain, {}, "Email Intelligence"), "uses_domain", "Email Intelligence");
  }
  const usernames = await prisma.usernameIntelligenceResult.findMany({ where: { tenantId, ...scope }, select: { username: true, data: true } });
  for (const result of usernames) {
    const usernameId = await ensure(EntityType.USERNAME, result.username, {}, "Username Intelligence");
    for (const profile of records(record(result.data).profiles)) {
      const url = typeof profile.profileUrl === "string" ? profile.profileUrl : null;
      if (url) await link(usernameId, await ensure(EntityType.PUBLIC_PROFILE, url, { platform: profile.platform ?? null }, "Username Intelligence"), "matches_public_profile", "Username Intelligence");
    }
  }
  const websites = await prisma.websiteIntelligenceResult.findMany({ where: { tenantId, ...scope }, select: { url: true, data: true } });
  for (const result of websites) {
    const websiteId = await ensure(EntityType.WEBSITE, result.url, {}, "Website Intelligence");
    try { await link(websiteId, await ensure(EntityType.DOMAIN, new URL(result.url).hostname, {}, "Website Intelligence"), "hosted_on", "Website Intelligence"); } catch { /* Stored website URLs were validated by the website collector. */ }
  }
  const threats = await prisma.threatIntelligenceResult.findMany({ where: { tenantId, ...scope }, select: { indicator: true, indicatorType: true } });
  for (const result of threats) {
    const threatId = await ensure(EntityType.THREAT_INDICATOR, result.indicator, { indicatorType: result.indicatorType }, "Threat Intelligence");
    const matching = await prisma.entity.findMany({ where: { tenantId, investigationId, value: result.indicator }, select: { id: true, type: true } });
    for (const entity of matching.filter((item) => item.id !== threatId)) await link(threatId, entity.id, "threatens_or_matches", "Threat Intelligence", 0.8, 0.8);
  }
  return { ...created, graph: await listGraph(tenantId, investigationId) };
}

function relationshipData(input: RelationshipInput, confidence: number) {
  return { fromEntityId: input.fromEntityId, toEntityId: input.toEntityId, type: input.type, confidence, sourceReferences: input.sourceReferences as Prisma.InputJsonValue | undefined, evidenceQuality: clamp(input.evidenceQuality ?? 0), corroborationScore: clamp(input.corroborationScore ?? 0), freshnessScore: clamp(input.freshnessScore ?? 0), metadata: input.metadata as Prisma.InputJsonValue | undefined };
}
function evidenceData(tenantId: string, input: RelationshipInput) {
  return (input.sourceReferences ?? []).flatMap((reference) => {
    const source = record(reference);
    const sourceUrl = typeof source.url === "string" ? source.url : typeof source.sourceUrl === "string" ? source.sourceUrl : null;
    const title = typeof source.title === "string" ? source.title : `Source for ${input.type}`;
    return [{ tenant: { connect: { id: tenantId } }, sourceUrl, title, metadata: { relationshipType: input.type, source, collectedAt: typeof source.collectedAt === "string" ? source.collectedAt : new Date().toISOString() } as Prisma.InputJsonValue }];
  });
}
function confidenceScore(sourceReliability: number, evidenceQuality: number, corroboration: number, freshness: number) { return Number((sourceReliability * 0.35 + evidenceQuality * 0.3 + corroboration * 0.2 + freshness * 0.15).toFixed(3)); }
function clamp(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function record(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function records(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.map(record) : []; }
