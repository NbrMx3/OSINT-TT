import crypto from "node:crypto";
import { isIP } from "node:net";
import { InvestigationCategory, InvestigationStatus, Prisma, RoleName, TargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { decryptSecret } from "../utils/secretCrypto";
import { AppError } from "../utils/appError";

export type IndicatorType = "ip" | "domain" | "url" | "hash";
type ProviderStatus = "available" | "unavailable" | "not_supported";
type Classification = "malicious" | "suspicious" | "clean" | "unknown";

export interface ThreatSourceReference {
  provider: string;
  url: string;
  status: ProviderStatus;
  lastChecked: string;
  detail?: string;
}

interface ProviderResult {
  provider: string;
  status: ProviderStatus;
  indicator: string;
  classification: Classification;
  reputation: { assessment: string; score: number | null; confidence: number; basis: string };
  evidence: Record<string, unknown>;
  lastChecked: string;
  sourceReference: ThreatSourceReference;
}

interface ThreatCollection {
  indicator: string;
  indicatorType: IndicatorType;
  providerResults: ProviderResult[];
  classification: Classification;
  reputation: { assessment: string; score: number | null; confidence: number; basis: string };
  evidence: Record<string, unknown>[];
  lastChecked: string;
  sources: ThreatSourceReference[];
  disclaimer: string;
}

const providerNames = ["VirusTotal", "AbuseIPDB", "AlienVault OTX", "Shodan", "URLhaus"];
const requestTimeoutMs = 8_000;
const maxResponseBytes = 2 * 1024 * 1024;

export function normalizeIndicator(value: string): { indicator: string; indicatorType: IndicatorType } {
  const indicator = value.trim();
  if (!indicator || indicator.length > 2048 || /[\r\n\0]/.test(indicator)) {
    throw new AppError(400, "Enter a valid IP address, domain, URL, or file hash", "INVALID_INDICATOR");
  }
  if (isIP(indicator)) return { indicator, indicatorType: "ip" };
  if (/^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i.test(indicator)) return { indicator: indicator.toLowerCase(), indicatorType: "hash" };
  try {
    const url = new URL(indicator);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    if (url.username || url.password) throw new Error("credentials are not allowed");
    url.hash = "";
    return { indicator: url.toString(), indicatorType: "url" };
  } catch {
    if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(indicator)) {
      throw new AppError(400, "Enter a valid IP address, domain, URL, or file hash", "INVALID_INDICATOR");
    }
    return { indicator: indicator.toLowerCase().replace(/\.$/, ""), indicatorType: "domain" };
  }
}

export async function investigateThreat(input: { indicator: string; tenantId: string; userId: string; role: RoleName; investigationId?: string }) {
  const normalized = normalizeIndicator(input.indicator);
  const investigation = input.investigationId
    ? await prisma.investigation.findFirst({ where: { id: input.investigationId, tenantId: input.tenantId } })
    : await prisma.investigation.create({
      data: {
        tenantId: input.tenantId, ownerId: input.userId, name: `Threat intelligence: ${normalized.indicator}`,
        description: `Provider-backed threat intelligence lookup for ${normalized.indicator}`,
        category: InvestigationCategory.THREAT,
        selectedModules: providerNames, status: InvestigationStatus.PENDING,
        targets: { create: { type: targetType(normalized.indicatorType), value: normalized.indicator } },
        activityLogs: { create: { tenantId: input.tenantId, userId: input.userId, action: "THREAT_INVESTIGATION_CREATED", entityType: "Investigation" } },
      },
    });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  if (investigation.category !== InvestigationCategory.THREAT) throw new AppError(400, "Investigation is not a threat intelligence investigation", "INVALID_INVESTIGATION_CATEGORY");
  if (investigation.ownerId !== input.userId && input.role !== RoleName.ADMINISTRATOR) throw new AppError(403, "You can only add results to investigations you own", "INVESTIGATION_OWNERSHIP_REQUIRED");

  await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.RUNNING, progress: 10, startedAt: new Date(), failureReason: null } });
  try {
    const data = await collectThreatIntelligence(normalized.indicator, normalized.indicatorType, input.tenantId);
    const contentHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const evidence = data.sources.filter((source) => source.status === "available").map((source) => ({
      tenantId: input.tenantId, sourceUrl: source.url, title: `${source.provider} threat intelligence for ${normalized.indicator}`,
      contentHash, metadata: { provider: source.provider, lastChecked: source.lastChecked },
    }));
    const result = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.threatIntelligenceResult.create({
        data: {
          tenantId: input.tenantId, investigationId: investigation.id, indicator: normalized.indicator,
          indicatorType: normalized.indicatorType, status: "COMPLETED", data: data as unknown as Prisma.InputJsonValue,
          sourceReferences: data.sources as unknown as Prisma.InputJsonValue, evidence: { create: evidence },
        },
      });
      await transaction.investigation.update({
        where: { id: investigation.id },
        data: { status: InvestigationStatus.COMPLETED, progress: 100, completedAt: new Date(), results: { threatResultId: saved.id, classification: data.classification } },
      });
      await transaction.activityLog.create({
        data: { tenantId: input.tenantId, userId: input.userId, investigationId: investigation.id, action: "THREAT_INTELLIGENCE_COMPLETED", entityType: "ThreatIntelligenceResult", entityId: saved.id, metadata: { indicator: normalized.indicator, indicatorType: normalized.indicatorType, providerCount: data.providerResults.length } },
      });
      return saved;
    });
    return { investigationId: investigation.id, result };
  } catch (error) {
    await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.FAILED, failureReason: error instanceof Error ? error.message : "Threat intelligence collection failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function getThreatResult(id: string, tenantId: string) {
  const result = await prisma.threatIntelligenceResult.findFirst({
    where: { id, tenantId },
    include: { investigation: { select: { id: true, name: true, status: true } }, evidence: { select: { id: true, sourceUrl: true, title: true, contentHash: true, collectedAt: true } } },
  });
  if (!result) throw new AppError(404, "Threat intelligence result not found", "THREAT_RESULT_NOT_FOUND");
  return result;
}

export async function listThreatHistory(tenantId: string, value?: string) {
  const normalized = value ? normalizeIndicator(value).indicator : undefined;
  return prisma.threatIntelligenceResult.findMany({
    where: { tenantId, ...(normalized ? { indicator: normalized } : {}) },
    select: { id: true, indicator: true, indicatorType: true, status: true, collectedAt: true, investigation: { select: { id: true, name: true, status: true } } },
    orderBy: { collectedAt: "desc" }, take: 50,
  });
}

async function collectThreatIntelligence(indicator: string, indicatorType: IndicatorType, tenantId: string): Promise<ThreatCollection> {
  const configs = await providerConfigs(tenantId);
  const [virusTotal, abuseIpDb, otx, shodan, urlhaus] = await Promise.all([
    collectVirusTotal(indicator, indicatorType, configs),
    collectAbuseIpDb(indicator, indicatorType, configs),
    collectOtx(indicator, indicatorType, configs),
    collectShodan(indicator, indicatorType, configs),
    collectUrlhaus(indicator, indicatorType),
  ]);
  const providerResults = [virusTotal, abuseIpDb, otx, shodan, urlhaus];
  const available = providerResults.filter((item) => item.status === "available");
  const malicious = available.filter((item) => item.classification === "malicious").length;
  const suspicious = available.filter((item) => item.classification === "suspicious").length;
  const classification: Classification = malicious > 0 ? "malicious" : suspicious > 0 ? "suspicious" : available.length ? "clean" : "unknown";
  const confidence = available.length ? Math.min(95, 45 + malicious * 20 + suspicious * 10) : 0;
  return {
    indicator, indicatorType, providerResults, classification,
    reputation: { assessment: classification === "unknown" ? "No provider verdict was available." : `OSINT-X analysis: ${classification} based on ${available.length} provider result(s).`, score: null, confidence, basis: "This assessment is derived from available provider verdicts and is not a provider verdict." },
    evidence: available.map((item) => ({ provider: item.provider, ...item.evidence })),
    lastChecked: new Date().toISOString(), sources: providerResults.map((item) => item.sourceReference),
    disclaimer: "Provider verdicts are reported separately. OSINT-X analysis is an aggregation and does not establish identity, intent, or definitive maliciousness.",
  };
}

async function collectVirusTotal(indicator: string, type: IndicatorType, configs: Map<string, Record<string, unknown>>): Promise<ProviderResult> {
  const key = providerKey("VirusTotal", "VIRUSTOTAL_API_KEY", configs);
  const path = type === "ip" ? `ip_addresses/${encodeURIComponent(indicator)}` : type === "domain" ? `domains/${encodeURIComponent(indicator)}` : type === "hash" ? `files/${encodeURIComponent(indicator)}` : `urls/${Buffer.from(indicator).toString("base64url")}`;
  return providerJson("VirusTotal", indicator, `https://www.virustotal.com/api/v3/${path}`, key, (payload) => {
    const attributes = record(record(payload).data).attributes;
    const stats = record(attributes).last_analysis_stats;
    const malicious = number(stats.malicious) + number(stats.suspicious);
    const total = Object.values(stats).filter((value) => typeof value === "number").reduce((sum, value) => sum + Number(value), 0);
    return { classification: malicious > 0 ? "malicious" : total > 0 ? "clean" : "unknown", score: total ? Math.round((malicious / total) * 100) : null, basis: "VirusTotal last_analysis_stats", evidence: { lastAnalysisStats: stats, reputation: attributes.reputation ?? null, tags: attributes.tags ?? [] } };
  });
}

async function collectAbuseIpDb(indicator: string, type: IndicatorType, configs: Map<string, Record<string, unknown>>): Promise<ProviderResult> {
  if (type !== "ip") return unsupported("AbuseIPDB", indicator, "AbuseIPDB supports IP address checks only.");
  const key = providerKey("AbuseIPDB", "ABUSEIPDB_API_KEY", configs);
  return providerJson("AbuseIPDB", indicator, `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(indicator)}&maxAgeInDays=90`, key, (payload) => {
    const data = record(record(payload).data);
    const score = typeof data.abuseConfidenceScore === "number" ? data.abuseConfidenceScore : null;
    return { classification: score === null ? "unknown" : score >= 75 ? "malicious" : score >= 25 ? "suspicious" : "clean", score, basis: "AbuseIPDB abuseConfidenceScore", evidence: { abuseConfidenceScore: score, totalReports: data.totalReports ?? 0, lastReportedAt: data.lastReportedAt ?? null, usageType: data.usageType ?? null, isWhitelisted: data.isWhitelisted ?? null } };
  }, { Key: key ?? "" });
}

async function collectOtx(indicator: string, type: IndicatorType, configs: Map<string, Record<string, unknown>>): Promise<ProviderResult> {
  const key = providerKey("AlienVault OTX", "OTX_API_KEY", configs);
  const otxType = type === "hash" ? "file" : type;
  return providerJson("AlienVault OTX", indicator, `https://otx.alienvault.com/api/v1/indicators/${otxType}/${encodeURIComponent(indicator)}/general`, key, (payload) => {
    const data = record(payload);
    const pulseCount = Array.isArray(data.pulse_info) ? data.pulse_info.length : number(record(data.pulse_info).count);
    return { classification: pulseCount > 0 ? "suspicious" : "clean", score: pulseCount ? Math.min(100, pulseCount * 10) : 0, basis: "AlienVault OTX pulse association count", evidence: { pulseCount, pulseInfo: data.pulse_info ?? null, sections: data.sections ?? [] } };
  }, key ? { "X-OTX-API-KEY": key } : {});
}

async function collectShodan(indicator: string, type: IndicatorType, configs: Map<string, Record<string, unknown>>): Promise<ProviderResult> {
  if (type !== "ip") return unsupported("Shodan", indicator, "Shodan host intelligence supports IP address lookups only.");
  const key = providerKey("Shodan", "SHODAN_API_KEY", configs);
  const sourceUrl = `https://api.shodan.io/shodan/host/${encodeURIComponent(indicator)}`;
  const requestUrl = key ? `${sourceUrl}?key=${encodeURIComponent(key)}` : sourceUrl;
  return providerJson("Shodan", indicator, requestUrl, key, (payload) => {
    const data = record(payload);
    const tags = stringArray(data.tags);
    const classification: Classification = tags.some((tag) => /malware|compromised|botnet|tor/i.test(tag)) ? "suspicious" : "clean";
    return { classification, score: classification === "suspicious" ? 60 : 0, basis: "Shodan passive host tags; no scan was initiated by OSINT-X.", evidence: { organization: data.org ?? null, ports: data.ports ?? [], tags, hostnames: data.hostnames ?? [] } };
  }, {}, undefined, sourceUrl);
}

async function collectUrlhaus(indicator: string, type: IndicatorType): Promise<ProviderResult> {
  if (type !== "url" && type !== "hash") return unsupported("URLhaus", indicator, "URLhaus supports URL and payload hash lookups.");
  const url = type === "url" ? "https://urlhaus-api.abuse.ch/v1/url/" : "https://urlhaus-api.abuse.ch/v1/payload/";
  const body = type === "url" ? `url=${encodeURIComponent(indicator)}` : `sha256_hash=${encodeURIComponent(indicator)}`;
  return providerJson("URLhaus", indicator, url, undefined, (payload) => {
    const data = record(payload);
    const listed = data.query_status === "ok";
    return { classification: listed ? "malicious" : "clean", score: listed ? 100 : 0, basis: "URLhaus listing status", evidence: { queryStatus: data.query_status ?? null, urlStatus: data.url_status ?? null, threat: data.threat ?? null, tags: data.tags ?? [] } };
  }, { "content-type": "application/x-www-form-urlencoded" }, body);
}

async function providerJson(provider: string, indicator: string, url: string, key: string | undefined, assess: (payload: unknown) => { classification: Classification; score: number | null; basis: string; evidence: Record<string, unknown> }, extraHeaders: Record<string, string> = {}, body?: string, sourceUrl = url): Promise<ProviderResult> {
  const lastChecked = new Date().toISOString();
  const sourceReference = { provider, url: sourceUrl, status: "unavailable" as ProviderStatus, lastChecked };
  if (key === undefined && provider !== "URLhaus") return { provider, status: "unavailable", indicator, classification: "unknown", reputation: { assessment: "Provider API key is not configured.", score: null, confidence: 0, basis: "No provider request was made." }, evidence: {}, lastChecked, sourceReference: { ...sourceReference, detail: `${provider} API key is not configured.` } };
  try {
    const payload = await requestJson(url, { ...(key ? { authorization: `Bearer ${key}`, "x-apikey": key } : {}), ...extraHeaders }, body);
    const result = assess(payload);
    return { provider, status: "available", indicator, classification: result.classification, reputation: { assessment: `Provider verdict: ${result.classification}.`, score: result.score, confidence: result.classification === "unknown" ? 0 : 80, basis: result.basis }, evidence: result.evidence, lastChecked, sourceReference: { ...sourceReference, status: "available" } };
  } catch (error) {
    return { provider, status: "unavailable", indicator, classification: "unknown", reputation: { assessment: "Provider response unavailable.", score: null, confidence: 0, basis: "The provider did not return a usable response." }, evidence: {}, lastChecked, sourceReference: { ...sourceReference, detail: safeError(error) } };
  }
}

function unsupported(provider: string, indicator: string, detail: string): ProviderResult {
  const lastChecked = new Date().toISOString();
  return { provider, status: "not_supported", indicator, classification: "unknown", reputation: { assessment: "This provider does not support this indicator type.", score: null, confidence: 0, basis: "No provider request was made." }, evidence: {}, lastChecked, sourceReference: { provider, url: "", status: "not_supported", lastChecked, detail } };
}

async function requestJson(url: string, headers: Record<string, string>, body?: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(url, { method: body ? "POST" : "GET", headers: { accept: "application/json", ...headers }, body, redirect: "error", signal: controller.signal });
      if (response.ok) {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > maxResponseBytes) throw new Error("Provider response exceeded the configured size limit");
        return JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown;
      }
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`Provider returned HTTP ${response.status}`);
      lastError = new Error(`Provider returned HTTP ${response.status}`);
    } catch (error) { lastError = error; }
    finally { clearTimeout(timeout); }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error("Provider request failed");
}

async function providerConfigs(tenantId: string): Promise<Map<string, Record<string, unknown>>> {
  const configurations = await prisma.apiConfiguration.findMany({ where: { tenantId, isActive: true, provider: { in: providerNames } }, select: { provider: true, encryptedConfig: true } });
  const result = new Map<string, Record<string, unknown>>();
  for (const configuration of configurations) {
    try {
      const value = JSON.parse(decryptSecret(configuration.encryptedConfig)) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) result.set(configuration.provider, value as Record<string, unknown>);
    } catch { /* Invalid configuration is treated as unavailable, never as a provider result. */ }
  }
  return result;
}

function providerKey(provider: string, environmentName: string, configs: Map<string, Record<string, unknown>>): string | undefined {
  const configured = configs.get(provider)?.apiKey;
  return typeof configured === "string" && configured ? configured : process.env[environmentName] || undefined;
}
function targetType(type: IndicatorType): TargetType { return type === "ip" ? TargetType.IP : type === "domain" ? TargetType.DOMAIN : type === "url" ? TargetType.WEBSITE : TargetType.HASH; }
function record(value: unknown): Record<string, any> { return typeof value === "object" && value !== null ? value as Record<string, any> : {}; }
function number(value: unknown): number { return typeof value === "number" ? value : 0; }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function safeError(error: unknown): string { return (error instanceof Error ? error.message : "Provider unavailable").replace(/([?&](?:key|api_key|apikey)=)[^&\s]+/gi, "$1[redacted]").slice(0, 240); }
