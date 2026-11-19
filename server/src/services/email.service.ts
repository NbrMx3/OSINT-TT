import crypto from "node:crypto";
import { domainToASCII } from "node:url";
import { InvestigationCategory, InvestigationStatus, Prisma, RoleName, TargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { collectRdap } from "./rdap.service";
import { collectEmailDns } from "./email-dns.service";

type SourceStatus = "available" | "unavailable" | "not_requested";
export interface EmailSourceReference { name: string; url: string; status: SourceStatus; collectedAt: string; detail?: string; }

export function normalizeEmail(value: string): { email: string; domain: string } {
  const email = value.trim();
  const separator = email.lastIndexOf("@");
  const inputDomain = separator >= 0 ? email.slice(separator + 1).toLowerCase() : "";
  const domain = domainToASCII(inputDomain);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !domain || domain.length > 253 || domain.split(".").some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) throw new AppError(400, "Enter a valid email address", "INVALID_EMAIL");
  return { email, domain: domain.toLowerCase() };
}

export async function investigateEmail(input: { email: string; tenantId: string; userId: string; role: RoleName; investigationId?: string; checkBreachExposure: boolean; searchPublicReferences: boolean }) {
  const { email, domain } = normalizeEmail(input.email);
  const investigation = input.investigationId
    ? await prisma.investigation.findFirst({ where: { id: input.investigationId, tenantId: input.tenantId } })
    : await prisma.investigation.create({ data: {
      tenantId: input.tenantId, ownerId: input.userId, name: `Email intelligence: ${email}`, description: `Public email and email-domain intelligence collection for ${email}`,
      category: InvestigationCategory.EMAIL, selectedModules: ["MX", "SPF", "DMARC", "DKIM", "RDAP", "Authorized breach exposure", "Public code references"], status: InvestigationStatus.PENDING,
      targets: { create: { type: TargetType.EMAIL, value: email } }, activityLogs: { create: { tenantId: input.tenantId, userId: input.userId, action: "EMAIL_INVESTIGATION_CREATED", entityType: "Investigation" } },
    } });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  if (investigation.category !== InvestigationCategory.EMAIL) throw new AppError(400, "Investigation is not an email investigation", "INVALID_INVESTIGATION_CATEGORY");
  if (investigation.ownerId !== input.userId && input.role !== RoleName.ADMINISTRATOR) throw new AppError(403, "You can only add results to investigations you own", "INVESTIGATION_OWNERSHIP_REQUIRED");

  await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.RUNNING, progress: 10, startedAt: new Date(), failureReason: null } });
  try {
    const [dns, registration, breachExposure, publicReferences] = await Promise.all([
      collectEmailDns(domain), collectRdap(domain), checkBreachExposure(email, input.checkBreachExposure), searchPublicEmailReferences(email, input.searchPublicReferences),
    ]);
    const collectedAt = new Date().toISOString();
    const sources: EmailSourceReference[] = [
      { name: "System DNS resolver", url: "", status: dns.mx.available || dns.spf.available || dns.dmarc.available || dns.dkim.available ? "available" : "unavailable", collectedAt, detail: "DNS data queried through the server's configured recursive resolver." },
      registration.source,
      breachExposure.source,
      publicReferences.source,
    ];
    const data = { email, domain, collectedAt, dns, registration: { available: registration.available, data: registration.data, error: registration.error ?? null }, breachExposure: { checked: breachExposure.checked, available: breachExposure.available, breaches: breachExposure.breaches, error: breachExposure.error ?? null }, publicReferences: { checked: publicReferences.checked, available: publicReferences.available, references: publicReferences.references, error: publicReferences.error ?? null }, sources };
    const contentHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const evidence = sources.filter((source) => source.status === "available" && source.url).map((source) => ({ tenantId: input.tenantId, sourceUrl: source.url, title: `${source.name} result for ${email}`, contentHash, metadata: { source: source.name, collectedAt: source.collectedAt } }));
    const result = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.emailIntelligenceResult.create({ data: { tenantId: input.tenantId, investigationId: investigation.id, email, status: "COMPLETED", data: data as unknown as Prisma.InputJsonValue, sourceReferences: sources as unknown as Prisma.InputJsonValue, evidence: { create: evidence } } });
      await transaction.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.COMPLETED, progress: 100, completedAt: new Date(), results: { emailResultId: saved.id, findingsCreated: 0 } } });
      await transaction.activityLog.create({ data: { tenantId: input.tenantId, userId: input.userId, investigationId: investigation.id, action: "EMAIL_INTELLIGENCE_COMPLETED", entityType: "EmailIntelligenceResult", entityId: saved.id, metadata: { domain, sourceCount: sources.length } } });
      return saved;
    });
    return { investigationId: investigation.id, result };
  } catch (error) {
    await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.FAILED, failureReason: error instanceof Error ? error.message : "Email intelligence collection failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function getEmailResult(id: string, tenantId: string) {
  const result = await prisma.emailIntelligenceResult.findFirst({ where: { id, tenantId }, include: { investigation: { select: { id: true, name: true, status: true } }, evidence: { select: { id: true, sourceUrl: true, title: true, contentHash: true, collectedAt: true } } } });
  if (!result) throw new AppError(404, "Email intelligence result not found", "EMAIL_RESULT_NOT_FOUND");
  return result;
}

export async function listEmailHistory(tenantId: string, value?: string) {
  const email = value ? normalizeEmail(value).email : undefined;
  return prisma.emailIntelligenceResult.findMany({ where: { tenantId, ...(email ? { email } : {}) }, select: { id: true, email: true, status: true, collectedAt: true, investigation: { select: { id: true, name: true, status: true } } }, orderBy: { collectedAt: "desc" }, take: 50 });
}

async function checkBreachExposure(email: string, requested: boolean) {
  const collectedAt = new Date().toISOString();
  const base = { name: "Have I Been Pwned", url: "https://haveibeenpwned.com/", collectedAt };
  if (!requested) return { checked: false, available: false, breaches: [] as unknown[], error: "Not requested", source: { ...base, status: "not_requested" as const } };
  if (!process.env.HIBP_API_KEY) return { checked: true, available: false, breaches: [] as unknown[], error: "HIBP_API_KEY is not configured", source: { ...base, status: "unavailable" as const, detail: "Configure an authorized Have I Been Pwned API key on the server." } };
  const url = `https://haveibeenpwned.com/api/v3/breachedAccount/${encodeURIComponent(email)}?truncateResponse=false`;
  try {
    const response = await fetch(url, { headers: { "hibp-api-key": process.env.HIBP_API_KEY, "user-agent": "OSINT-X/1.0 (authorized email exposure check)", accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return { checked: true, available: true, breaches: [], source: { ...base, status: "available" as const, detail: "HIBP returned no breach records for this address." } };
    if (!response.ok) throw new Error(`HIBP returned HTTP ${response.status}`);
    const payload = await response.json() as Array<Record<string, unknown>>;
    const breaches = payload.map((entry) => ({ name: entry.Name, title: entry.Title, domain: entry.Domain, breachDate: entry.BreachDate, dataClasses: entry.DataClasses, verified: entry.IsVerified, sensitive: entry.IsSensitive, retired: entry.IsRetired }));
    return { checked: true, available: true, breaches, source: { ...base, status: "available" as const } };
  } catch (error) {
    return { checked: true, available: false, breaches: [] as unknown[], error: error instanceof Error ? error.message : "HIBP unavailable", source: { ...base, status: "unavailable" as const } };
  }
}

async function searchPublicEmailReferences(email: string, requested: boolean) {
  const collectedAt = new Date().toISOString();
  const searchUrl = `https://github.com/search?q=${encodeURIComponent(`"${email}"`)}&type=code`;
  const base = { name: "GitHub public code search", url: searchUrl, collectedAt };
  if (!requested) return { checked: false, available: false, references: [] as unknown[], error: "Not requested", source: { ...base, status: "not_requested" as const } };
  if (!process.env.GITHUB_API_TOKEN) return { checked: true, available: false, references: [] as unknown[], error: "GITHUB_API_TOKEN is not configured; GitHub code search requires an authenticated API token", source: { ...base, status: "unavailable" as const } };
  const apiUrl = `https://api.github.com/search/code?q=${encodeURIComponent(`"${email}"`)}&per_page=10`;
  try {
    const response = await fetch(apiUrl, { headers: { authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "OSINT-X/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`GitHub code search returned HTTP ${response.status}`);
    const payload = await response.json() as { items?: Array<{ repository?: { full_name?: string; html_url?: string }; path?: string; html_url?: string }> };
    const references = (payload.items ?? []).map((item) => ({ repository: item.repository?.full_name ?? null, repositoryUrl: item.repository?.html_url ?? null, path: item.path ?? null, url: item.html_url ?? null }));
    return { checked: true, available: true, references, source: { ...base, status: "available" as const } };
  } catch (error) {
    return { checked: true, available: false, references: [] as unknown[], error: error instanceof Error ? error.message : "GitHub code search unavailable", source: { ...base, status: "unavailable" as const } };
  }
}
