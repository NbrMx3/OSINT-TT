import dns from "node:dns/promises";
import type { DomainSourceReference } from "../types/domain";

interface ResolverValue<T> { available: boolean; values: T[]; error?: string; }

export interface DnsCollection { a: ResolverValue<string>; aaaa: ResolverValue<string>; mx: ResolverValue<Record<string, unknown>>; txt: ResolverValue<string>; ns: ResolverValue<string>; cname: ResolverValue<string>; dnssec: { available: boolean; records: unknown[]; error?: string }; associatedIps: string[]; source: DomainSourceReference; }

export async function collectDnsRecords(domain: string): Promise<DnsCollection> {
  const [a, aaaa, mx, txt, ns, cname, any] = await Promise.all([attempt(() => dns.resolve4(domain)), attempt(() => dns.resolve6(domain)), attempt(() => dns.resolveMx(domain)), attempt(() => dns.resolveTxt(domain)), attempt(() => dns.resolveNs(domain)), attempt(() => dns.resolveCname(domain)), attempt(() => dns.resolveAny(domain))]);
  const dnssecRecords = any.available ? any.values.filter((record) => typeof record === "object" && record !== null && ["DS", "DNSKEY", "RRSIG"].includes(String((record as { type?: string }).type))) : [];
  const dnssec = dnssecRecords.length ? { available: true, records: dnssecRecords } : { available: false, records: [], error: any.error ?? "No DNSSEC records were returned by the configured resolver." };
  const associatedIps = [...a.values, ...aaaa.values];
  return { a, aaaa, mx: { ...mx, values: mx.values.map((record) => typeof record === "object" && record !== null ? record as unknown as Record<string, unknown> : { value: String(record) }) }, txt: { ...txt, values: txt.values.map((chunks) => Array.isArray(chunks) ? chunks.join("") : String(chunks)) }, ns, cname, dnssec, associatedIps, source: { name: "Public DNS resolver", url: `dns://${domain}`, status: "available", collectedAt: new Date().toISOString() } };
}

async function attempt<T>(operation: () => Promise<T[]>): Promise<ResolverValue<T>> { try { return { available: true, values: await operation() }; } catch (error) { return { available: false, values: [], error: error instanceof Error ? error.message : "DNS record unavailable" }; } }
