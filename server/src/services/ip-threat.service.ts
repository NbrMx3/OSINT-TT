import type { IpAvailability, IpSourceReference } from "../types/ip";
import { fetchJson, sourceRef } from "./ip-lookup.service";

const VT_BASE = "https://www.virustotal.com/api/v3";
const ABUSE_URL = "https://api.abuseipdb.com/api/v2/check";
const SHODAN_BASE = "https://api.shodan.io/shodan/host";

interface ProviderResult { result: IpAvailability & { data?: Record<string, unknown> }; source: IpSourceReference; associatedDomains: string[]; }

export async function collectIpThreatIntelligence(ip: string): Promise<{
  abuseIpDb: ProviderResult;
  virusTotal: ProviderResult;
  shodan: ProviderResult;
  sources: IpSourceReference[];
}> {
  const [abuseIpDb, virusTotal, shodan] = await Promise.all([
    collectAbuseIpDb(ip),
    collectVirusTotal(ip),
    collectShodan(ip),
  ]);
  return { abuseIpDb, virusTotal, shodan, sources: [abuseIpDb.source, virusTotal.source, shodan.source] };
}

async function collectAbuseIpDb(ip: string): Promise<ProviderResult> {
  const url = new URL(ABUSE_URL);
  url.searchParams.set("ipAddress", ip);
  url.searchParams.set("maxAgeInDays", "90");
  url.searchParams.set("verbose", "true");
  const source = sourceRef("AbuseIPDB", url.toString());
  const key = process.env.ABUSEIPDB_API_KEY;
  if (!key) return providerUnavailable("ABUSEIPDB_API_KEY is not configured", source);
  try {
    const payload = await fetchJson<{ data?: Record<string, unknown> }>(url.toString(), { Key: key });
    const data = payload.data ?? {};
    const reports = Array.isArray(data.reports) ? data.reports.slice(0, 25).map((value) => {
      const report = asRecord(value);
      return { reportedAt: report.reportedAt ?? null, comment: typeof report.comment === "string" ? report.comment.slice(0, 300) : null, categories: report.categories ?? [], reporterCountryCode: report.reporterCountryCode ?? null };
    }) : [];
    const hostnames = stringArray(data.hostnames);
    const domains = [...new Set([...hostnames, ...(typeof data.domain === "string" ? [data.domain] : [])])];
    return providerAvailable({
      ipAddress: data.ipAddress ?? ip,
      abuseConfidenceScore: data.abuseConfidenceScore ?? null,
      totalReports: data.totalReports ?? 0,
      distinctReporters: data.numDistinctUsers ?? 0,
      lastReportedAt: data.lastReportedAt ?? null,
      countryCode: data.countryCode ?? null,
      usageType: data.usageType ?? null,
      isp: data.isp ?? null,
      domain: data.domain ?? null,
      isWhitelisted: data.isWhitelisted ?? null,
      reports,
      reportsTruncated: Number(data.totalReports ?? 0) > reports.length,
    }, source, domains);
  } catch (error) { return providerUnavailable(error, source); }
}

async function collectVirusTotal(ip: string): Promise<ProviderResult> {
  const url = `${VT_BASE}/ip_addresses/${encodeURIComponent(ip)}`;
  const resolutionsUrl = `${url}/resolutions?limit=40`;
  const source = sourceRef("VirusTotal IP report and resolutions", url);
  const key = process.env.VIRUSTOTAL_API_KEY;
  if (!key) return providerUnavailable("VIRUSTOTAL_API_KEY is not configured", source);
  try {
    const payload = await fetchJson<{ data?: { attributes?: Record<string, unknown> } }>(url, { "x-apikey": key });
    const attributes = payload.data?.attributes ?? {};
    const [resolutions, resolutionError] = await loadVirusTotalResolutions(resolutionsUrl, key);
    const domains = resolutions.map((record) => record.domain);
    return providerAvailable({
      reputation: attributes.reputation ?? null,
      lastAnalysisStats: attributes.last_analysis_stats ?? null,
      totalVotes: attributes.total_votes ?? null,
      asOwner: attributes.as_owner ?? null,
      country: attributes.country ?? null,
      network: attributes.network ?? null,
      regionalInternetRegistry: attributes.regional_internet_registry ?? null,
      tags: stringArray(attributes.tags),
      resolutions,
      resolutionsUnavailableReason: resolutionError,
    }, source, domains);
  } catch (error) { return providerUnavailable(error, source); }
}

async function loadVirusTotalResolutions(url: string, key: string): Promise<[Array<{ domain: string; date: number | null; source: string | null }>, string | null]> {
  try {
    const payload = await fetchJson<{ data?: Array<{ attributes?: Record<string, unknown> }> }>(url, { "x-apikey": key });
    const records = (payload.data ?? []).flatMap((item) => {
      const attributes = item.attributes ?? {};
      return typeof attributes.host_name === "string" ? [{ domain: attributes.host_name, date: typeof attributes.date === "number" ? attributes.date : null, source: typeof attributes.resolver === "string" ? attributes.resolver : null }] : [];
    });
    return [records, null];
  } catch (error) { return [[], error instanceof Error ? error.message : "Domain resolutions unavailable"]; }
}

async function collectShodan(ip: string): Promise<ProviderResult> {
  const source = sourceRef("Shodan passive host database", `${SHODAN_BASE}/${encodeURIComponent(ip)}?minify=true`);
  const key = process.env.SHODAN_API_KEY;
  if (!key) return providerUnavailable("SHODAN_API_KEY is not configured", source);
  try {
    const url = new URL(`${SHODAN_BASE}/${encodeURIComponent(ip)}`);
    url.searchParams.set("key", key);
    url.searchParams.set("minify", "true");
    const payload = await fetchJson<Record<string, unknown>>(url.toString());
    const domains = [...new Set([...stringArray(payload.hostnames), ...stringArray(payload.domains)])];
    const data = {
      organization: payload.org ?? null,
      isp: payload.isp ?? null,
      asn: payload.asn ?? null,
      countryCode: payload.country_code ?? null,
      countryName: payload.country_name ?? null,
      city: payload.city ?? null,
      hostnames: stringArray(payload.hostnames),
      domains: stringArray(payload.domains),
      ports: Array.isArray(payload.ports) ? payload.ports : [],
      tags: stringArray(payload.tags),
      lastUpdated: payload.last_update ?? null,
      sourceDescription: "Previously observed host data from Shodan; no scan was initiated by OSINT-X.",
    };
    return providerAvailable(data, source, domains);
  } catch (error) { return providerUnavailable(error, source); }
}

function providerAvailable(data: Record<string, unknown>, source: IpSourceReference, associatedDomains: string[] = []): ProviderResult {
  return { result: { available: true, data }, source: { ...source, status: "available" }, associatedDomains };
}

function providerUnavailable(error: unknown, source: IpSourceReference): ProviderResult {
  const message = error instanceof Error ? error.message : "Provider unavailable";
  return { result: { available: false, error: message }, source: { ...source, status: "unavailable" }, associatedDomains: [] };
}

function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function asRecord(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }
