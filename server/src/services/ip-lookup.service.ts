import dns from "node:dns/promises";
import type { IpAvailability, IpSourceReference } from "../types/ip";

const GEO_URL = "https://ipwho.is";
const RDAP_URL = "https://rdap.org/ip";

export async function collectIpGeolocation(ip: string) {
  const source = sourceRef("IP geolocation (ipwho.is)", `${GEO_URL}/${encodeURIComponent(ip)}`);
  try {
    const payload = await fetchJson<Record<string, unknown>>(source.url);
    if (payload.success !== true) throw new Error(typeof payload.message === "string" ? payload.message : "Geolocation provider returned no data");
    const connection = asRecord(payload.connection);
    const security = asRecord(payload.security);
    return {
      available: true,
      data: {
        country: payload.country ?? null,
        countryCode: payload.country_code ?? null,
        region: payload.region ?? null,
        regionCode: payload.region_code ?? null,
        city: payload.city ?? null,
        continent: payload.continent ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        timezone: asRecord(payload.timezone).id ?? null,
        asn: connection.asn ?? null,
        organisation: connection.org ?? null,
        isp: connection.isp ?? null,
        networkDomain: connection.domain ?? null,
        hosting: security.hosting ?? null,
        proxy: security.proxy ?? null,
        vpn: security.vpn ?? null,
        tor: security.tor ?? null,
      },
      source: { ...source, status: "available" as const },
    };
  } catch (error) { return unavailable(error, source); }
}

export async function collectIpRegistration(ip: string) {
  const source = sourceRef("RDAP network registration", `${RDAP_URL}/${encodeURIComponent(ip)}`);
  try {
    const payload = await fetchJson<Record<string, unknown>>(source.url, { accept: "application/rdap+json, application/json" });
    const entities = Array.isArray(payload.entities) ? payload.entities.map((entity) => asRecord(entity)) : [];
    const organization = entities.map(readVcardOrganization).find(Boolean) ?? null;
    return {
      available: true,
      data: {
        name: payload.name ?? null,
        handle: payload.handle ?? null,
        type: payload.type ?? null,
        country: payload.country ?? null,
        startAddress: payload.startAddress ?? null,
        endAddress: payload.endAddress ?? null,
        range: typeof payload.startAddress === "string" && typeof payload.endAddress === "string" ? `${payload.startAddress}–${payload.endAddress}` : null,
        ipVersion: payload.ipVersion ?? null,
        parentHandle: payload.parentHandle ?? null,
        port43: payload.port43 ?? null,
        organisation: organization,
        status: Array.isArray(payload.status) ? payload.status : [],
      },
      source: { ...source, status: "available" as const },
    };
  } catch (error) { return unavailable(error, source); }
}

export async function collectReverseDns(ip: string) {
  const source = sourceRef("Reverse DNS (PTR)", `dns://${ip}`);
  try {
    const hostnames = await withTimeout(dns.reverse(ip), 5000);
    return { available: hostnames.length > 0, data: { hostnames }, ...(!hostnames.length ? { error: "No PTR records returned" } : {}), source: { ...source, status: hostnames.length ? "available" as const : "unavailable" as const } };
  } catch (error) { return unavailable<{ hostnames: string[] }>(error, source); }
}

function readVcardOrganization(entity: Record<string, unknown>): string | null {
  const vcard = entity.vcardArray;
  if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) return null;
  for (const item of vcard[1]) {
    if (Array.isArray(item) && (item[0] === "org" || item[0] === "fn") && typeof item[3] === "string") return item[3];
  }
  return null;
}

export function sourceRef(name: string, url: string, status: "available" | "unavailable" = "unavailable"): IpSourceReference {
  return { name, url, status, collectedAt: new Date().toISOString() };
}

export function unavailable<T = Record<string, unknown>>(error: unknown, source: IpSourceReference): IpAvailability<T> & { source: IpSourceReference } {
  return { available: false, error: error instanceof Error ? error.message : "Source unavailable", source: { ...source, status: "unavailable" } };
}

export async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json", ...headers }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  return await response.json() as T;
}

function asRecord(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Reverse DNS lookup timed out")), milliseconds);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}
