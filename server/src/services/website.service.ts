import crypto from "node:crypto";
import dns from "node:dns/promises";
import { isIP } from "node:net";
import { InvestigationCategory, InvestigationStatus, Prisma, RoleName, TargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { collectDomainReputation } from "./domain.service";
import { fetchPublicUrl, normalizeWebsiteUrl, sanitizeUrlForStorage, type PublicHttpResponse } from "./website-fetch.service";

type SourceStatus = "available" | "unavailable";
export interface WebsiteSourceReference { name: string; url: string; status: SourceStatus; collectedAt: string; detail?: string; }
type DnsBlock<T> = { available: boolean; values: T[]; error?: string };

export async function investigateWebsite(input: { url: string; tenantId: string; userId: string; role: RoleName; investigationId?: string }) {
  const url = normalizeWebsiteUrl(input.url);
  const storedUrl = sanitizeUrlForStorage(url);
  const investigation = input.investigationId
    ? await prisma.investigation.findFirst({ where: { id: input.investigationId, tenantId: input.tenantId } })
    : await prisma.investigation.create({ data: {
      tenantId: input.tenantId, ownerId: input.userId, name: `Website intelligence: ${storedUrl}`, description: `Passive public website metadata and security-header collection for ${storedUrl}`,
      category: InvestigationCategory.WEBSITE, selectedModules: ["HTTP metadata", "TLS certificate", "Security headers", "robots.txt", "Sitemap", "DNS", "Technology indicators", "Domain reputation"], status: InvestigationStatus.PENDING,
      targets: { create: { type: TargetType.WEBSITE, value: storedUrl } }, activityLogs: { create: { tenantId: input.tenantId, userId: input.userId, action: "WEBSITE_INVESTIGATION_CREATED", entityType: "Investigation" } },
    } });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  if (investigation.category !== InvestigationCategory.WEBSITE) throw new AppError(400, "Investigation is not a website investigation", "INVALID_INVESTIGATION_CATEGORY");
  if (investigation.ownerId !== input.userId && input.role !== RoleName.ADMINISTRATOR) throw new AppError(403, "You can only add results to investigations you own", "INVESTIGATION_OWNERSHIP_REQUIRED");
  await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.RUNNING, progress: 10, startedAt: new Date(), failureReason: null } });
  try {
    const data = await collectWebsiteSnapshot(url, input.tenantId);
    const contentHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const evidence = data.sources.filter((source) => source.status === "available" && source.url).map((source) => ({ tenantId: input.tenantId, sourceUrl: source.url, title: `${source.name} for ${storedUrl}`, contentHash, metadata: { source: source.name, collectedAt: source.collectedAt } }));
    const result = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.websiteIntelligenceResult.create({ data: { tenantId: input.tenantId, investigationId: investigation.id, url: storedUrl, status: "COMPLETED", data: data as unknown as Prisma.InputJsonValue, sourceReferences: data.sources as unknown as Prisma.InputJsonValue, evidence: { create: evidence } } });
      await transaction.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.COMPLETED, progress: 100, completedAt: new Date(), results: { websiteResultId: saved.id, findingsCreated: 0 } } });
      await transaction.activityLog.create({ data: { tenantId: input.tenantId, userId: input.userId, investigationId: investigation.id, action: "WEBSITE_INTELLIGENCE_COMPLETED", entityType: "WebsiteIntelligenceResult", entityId: saved.id, metadata: { url: storedUrl, sourceCount: data.sources.length } } });
      return saved;
    });
    return { investigationId: investigation.id, result };
  } catch (error) {
    await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.FAILED, failureReason: error instanceof Error ? error.message : "Website intelligence collection failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function getWebsiteResult(id: string, tenantId: string) {
  const result = await prisma.websiteIntelligenceResult.findFirst({ where: { id, tenantId }, include: { investigation: { select: { id: true, name: true, status: true } }, evidence: { select: { id: true, sourceUrl: true, title: true, contentHash: true, collectedAt: true } } } });
  if (!result) throw new AppError(404, "Website intelligence result not found", "WEBSITE_RESULT_NOT_FOUND");
  return result;
}

export async function listWebsiteHistory(tenantId: string, value?: string) {
  const url = value ? sanitizeUrlForStorage(normalizeWebsiteUrl(value)) : undefined;
  return prisma.websiteIntelligenceResult.findMany({ where: { tenantId, ...(url ? { url } : {}) }, select: { id: true, url: true, status: true, collectedAt: true, investigation: { select: { id: true, name: true, status: true } } }, orderBy: { collectedAt: "desc" }, take: 50 });
}

async function collectWebsiteSnapshot(inputUrl: URL, tenantId: string) {
  const collectedAt = new Date().toISOString();
  let pageResponse: PublicHttpResponse | null = null;
  let pageError: string | null = null;
  try { pageResponse = await fetchPublicUrl(inputUrl); }
  catch (error) { pageError = safeError(error); }
  const root = new URL(pageResponse?.url ?? inputUrl.toString());
  const domain = root.hostname.replace(/^\[|\]$/g, "");
  const isIpLiteral = Boolean(isIP(domain));
  const [robots, dnsRecords, reputation] = await Promise.all([
    collectRobots(new URL("/robots.txt", root.origin), root.origin),
    isIpLiteral ? Promise.resolve({ available: false, records: emptyDns(), error: "DNS record collection is not applicable to an IP-literal website URL", source: source("Public DNS records", "", "unavailable", collectedAt) }) : collectWebsiteDns(domain),
    isIpLiteral ? Promise.resolve({ available: false, providers: [], error: "Domain reputation is unavailable for an IP-literal website URL", source: source("Configured domain reputation provider", "", "unavailable", collectedAt) }) : collectDomainReputation(domain, tenantId),
  ]);
  const sitemapResult = await collectSitemap(new URL("/sitemap.xml", root.origin), robots, root.origin);
  const sources: WebsiteSourceReference[] = [
    source("Public website HTTP response", pageResponse ? sanitizeUrlForStorage(pageResponse.url) : sanitizeUrlForStorage(inputUrl), pageResponse ? "available" : "unavailable", collectedAt, pageError ?? undefined),
    source("TLS peer certificate", pageResponse?.tls ? sanitizeUrlForStorage(pageResponse.url) : "", pageResponse?.tls ? "available" : "unavailable", collectedAt, pageResponse?.tls ? undefined : "HTTPS certificate data is unavailable for this response."),
    robots.source,
    sitemapResult.source,
    dnsRecords.source,
    reputation.source,
  ];
  const headerNames = ["strict-transport-security", "content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"];
  const headers = pageResponse?.headers ?? {};
  const securityHeaders = headerNames.map((name) => ({ name, present: Boolean(headers[name]), value: headers[name] ?? null }));
  const html = pageResponse && /(?:text\/html|application\/xhtml\+xml)/i.test(headers["content-type"] ?? "") ? pageResponse.body : "";
  const page = { available: Boolean(pageResponse && html), status: pageResponse?.status ?? null, statusText: pageResponse?.statusText ?? null, finalUrl: pageResponse ? sanitizeUrlForStorage(pageResponse.url) : null, contentType: headers["content-type"] ?? null, title: matchTitle(html), description: matchMeta(html, "description"), openGraphTitle: matchMeta(html, "og:title"), openGraphDescription: matchMeta(html, "og:description"), openGraphImage: matchMeta(html, "og:image"), canonical: matchCanonical(html), generator: matchMeta(html, "generator"), language: html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1] ?? null, error: pageError };
  const technologies = identifyTechnologies(html, headers, page.generator);
  return {
    requestedUrl: sanitizeUrlForStorage(inputUrl), collectedAt,
    http: { available: Boolean(pageResponse), status: pageResponse?.status ?? null, statusText: pageResponse?.statusText ?? null, finalUrl: page.finalUrl, contentType: page.contentType, server: headers.server ?? null, redirects: pageResponse?.redirects ?? [], error: pageError },
    page,
    tls: pageResponse?.tls ?? null,
    securityHeaders,
    robots,
    sitemap: sitemapResult,
    dns: dnsRecords,
    technologies,
    reputation: { available: reputation.available, providers: reputation.providers, error: reputation.error ?? null },
    sources,
  };
}

async function collectWebsiteDns(domain: string) {
  const collectedAt = new Date().toISOString();
  const resolver = new dns.Resolver({ timeout: 3500, tries: 1 });
  const [a, aaaa, mx, ns, txt, cname] = await Promise.all([
    dnsAttempt(() => resolver.resolve4(domain)), dnsAttempt(() => resolver.resolve6(domain)), dnsAttempt(() => resolver.resolveMx(domain)),
    dnsAttempt(() => resolver.resolveNs(domain)), dnsAttempt(() => resolver.resolveTxt(domain)), dnsAttempt(() => resolver.resolveCname(domain)),
  ]);
  const records = { a, aaaa, mx, ns, txt: { ...txt, values: txt.values.map((chunks) => chunks.join("")) }, cname };
  const available = Object.values(records).some((block) => block.available);
  return { available, records, error: available ? null : "No DNS records were returned", source: source("Public DNS records", `dns://${domain}`, available ? "available" : "unavailable", collectedAt) };
}

function emptyDns() {
  return Object.fromEntries(["a", "aaaa", "mx", "ns", "txt", "cname"].map((key) => [key, { available: false, values: [], error: "Unavailable" }]));
}

async function dnsAttempt<T>(resolve: () => Promise<T[]>): Promise<DnsBlock<T>> {
  try { const values = await resolve(); return values.length ? { available: true, values: values.slice(0, 32) } : { available: false, values: [], error: "No records returned" }; }
  catch (error) { return { available: false, values: [], error: safeError(error) }; }
}

async function collectRobots(url: URL, sameOrigin: string, maxBytes = 128 * 1024) {
  const collectedAt = new Date().toISOString();
  try {
    const response = await fetchPublicUrl(url, maxBytes);
    const available = response.status >= 200 && response.status < 300;
    const lines = available ? response.body.split(/\r?\n/) : [];
    const directives = lines.map((line) => line.replace(/#.*/, "").trim()).filter(Boolean);
    const userAgents: string[] = [];
    const rules: Array<{ directive: "allow" | "disallow"; path: string; userAgent: string }> = [];
    const sitemapUrls: string[] = [];
    let currentAgent = "*";
    for (const line of directives) {
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      const name = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      if (name === "user-agent") { currentAgent = value || "*"; if (!userAgents.includes(currentAgent)) userAgents.push(currentAgent); }
      else if ((name === "allow" || name === "disallow") && value && rules.length < 500) rules.push({ directive: name, path: value.slice(0, 500), userAgent: currentAgent });
      else if (name === "sitemap" && value && sitemapUrls.length < 20) {
        try { const sitemapUrl = new URL(value); if (["http:", "https:"].includes(sitemapUrl.protocol)) sitemapUrls.push(sanitizeUrlForStorage(sitemapUrl)); } catch { /* Ignore malformed robots.txt links. */ }
      }
    }
    return { available, status: response.status, userAgents, rules, sitemapUrls, error: available ? null : `robots.txt returned HTTP ${response.status}`, source: source("Public robots.txt", sanitizeUrlForStorage(response.url), available ? "available" : "unavailable", collectedAt) };
  } catch (error) {
    return { available: false, status: null, userAgents: [] as string[], rules: [] as Array<{ directive: "allow" | "disallow"; path: string; userAgent: string }>, sitemapUrls: [] as string[], error: safeError(error), source: source("Public robots.txt", sanitizeUrlForStorage(url), "unavailable", collectedAt) };
  }
}

async function collectSitemap(defaultUrl: URL, robots: Awaited<ReturnType<typeof collectRobots>>, origin: string, maxBytes = 256 * 1024) {
  const collectedAt = new Date().toISOString();
  const declaredUrl = robots.sitemapUrls.find((entry) => { try { return new URL(entry).origin === origin; } catch { return false; } });
  const target = declaredUrl ? new URL(declaredUrl) : defaultUrl;
  try {
    const response = await fetchPublicUrl(target, maxBytes);
    const available = response.status >= 200 && response.status < 300;
    const locs = available ? [...response.body.matchAll(/<loc[^>]*>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim()).slice(0, 50) : [];
    const sameHostLocations = locs.flatMap((value) => {
      try { const location = new URL(value); return location.origin === origin ? [sanitizeUrlForStorage(location)] : []; }
      catch { return []; }
    });
    return { available, status: response.status, url: sanitizeUrlForStorage(response.url), locations: sameHostLocations, totalLocations: locs.length, error: available ? null : `Sitemap returned HTTP ${response.status}`, source: source("Public sitemap", sanitizeUrlForStorage(response.url), available ? "available" : "unavailable", collectedAt) };
  } catch (error) {
    return { available: false, status: null, url: sanitizeUrlForStorage(target), locations: [] as string[], totalLocations: 0, error: safeError(error), source: source("Public sitemap", sanitizeUrlForStorage(target), "unavailable", collectedAt) };
  }
}

function identifyTechnologies(html: string, headers: Record<string, string>, generator: string | null) {
  const matches: Array<{ name: string; evidence: string }> = [];
  const record = (name: string, evidence: string) => { if (!matches.some((item) => item.name === name)) matches.push({ name, evidence }); };
  if (headers.server) record("Web server", `Server header: ${headers.server}`);
  if (headers["x-powered-by"]) record("Server runtime", `X-Powered-By: ${headers["x-powered-by"]}`);
  if (generator) record("Generator", `Meta generator: ${generator}`);
  if (/\/(?:wp-content|wp-includes)\//i.test(html)) record("WordPress", "Public HTML references wp-content or wp-includes assets");
  if (/_next\/(?:static|image)|__NEXT_DATA__/i.test(html)) record("Next.js", "Public HTML contains Next.js asset markers");
  if (/drupalSettings|\/sites\/default\/files\//i.test(html)) record("Drupal", "Public HTML contains Drupal asset markers");
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(html)) record("Shopify", "Public HTML contains Shopify asset markers");
  if (/Joomla!|option=com_content/i.test(html)) record("Joomla", "Public HTML contains Joomla markers");
  return { available: Boolean(matches.length), matches, method: "Passive response-header and HTML signature matching; indicators can be incomplete or spoofed." };
}

function matchTitle(html: string): string | null { return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 500) ?? null; }
function matchMeta(html: string, key: string): string | null {
  if (!html) return null;
  const attribute = key.startsWith("og:") ? "property" : "name";
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = new RegExp(`<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i");
  const second = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${escaped}["']`, "i");
  return html.match(first)?.[1]?.trim().slice(0, 1000) ?? html.match(second)?.[1]?.trim().slice(0, 1000) ?? null;
}
function matchCanonical(html: string): string | null { return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]?.slice(0, 2048) ?? null; }
function source(name: string, url: string, status: SourceStatus, collectedAt: string, detail?: string): WebsiteSourceReference { return { name, url, status, collectedAt, ...(detail ? { detail } : {}) }; }
function safeError(error: unknown): string { return error instanceof Error ? error.message : "Source unavailable"; }
