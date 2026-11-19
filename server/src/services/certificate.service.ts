import type { DomainSourceReference } from "../types/domain";

export interface CertificateCollection { available: boolean; records: Array<Record<string, unknown>>; error?: string; source: DomainSourceReference; }

export async function collectCertificates(domain: string): Promise<CertificateCollection> {
  const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
  const collectedAt = new Date().toISOString();
  try {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Certificate transparency returned HTTP ${response.status}`);
    const payload = await response.json() as Array<Record<string, unknown>>;
    const pairs = payload.flatMap((entry) => String(entry.name_value ?? "").split("\n").map((name) => name.trim().toLowerCase()).filter(Boolean).map((name) => [name, { name, issuer: entry.issuer_name ?? null, notBefore: entry.not_before ?? null, notAfter: entry.not_after ?? null, certificateId: entry.id ?? null }] as const));
    const records = [...new Map(pairs).values()];
    return { available: true, records, source: { name: "crt.sh Certificate Transparency", url, status: "available", collectedAt } };
  } catch (error) { return { available: false, records: [], error: error instanceof Error ? error.message : "Certificate transparency unavailable", source: { name: "crt.sh Certificate Transparency", url, status: "unavailable", collectedAt } }; }
}
