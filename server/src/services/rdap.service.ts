import type { DomainSourceReference } from "../types/domain";

export interface RdapCollection { available: boolean; data: Record<string, unknown> | null; error?: string; source: DomainSourceReference; }

export async function collectRdap(domain: string): Promise<RdapCollection> {
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const collectedAt = new Date().toISOString();
  try {
    const response = await fetch(url, { headers: { accept: "application/rdap+json, application/json" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`RDAP returned HTTP ${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const entities = Array.isArray(payload.entities) ? payload.entities as Array<Record<string, unknown>> : [];
    const registrar = entities.find((entity) => Array.isArray(entity.roles) && (entity.roles as unknown[]).includes("registrar"));
    const events = Array.isArray(payload.events) ? payload.events as Array<Record<string, unknown>> : [];
    const eventDate = (action: string) => events.find((event) => event.eventAction === action)?.eventDate ?? null;
    const nameservers = Array.isArray(payload.nameservers) ? payload.nameservers.map((entry) => (entry as Record<string, unknown>).ldhName).filter((value): value is string => typeof value === "string") : [];
    const data = { ldhName: payload.ldhName ?? domain, handle: payload.handle ?? null, status: payload.status ?? [], registrar: registrar ? extractRegistrar(registrar) : null, registrationDate: eventDate("registration"), expirationDate: eventDate("expiration"), lastChangedDate: eventDate("last changed"), nameservers };
    return { available: true, data, source: { name: "RDAP", url, status: "available", collectedAt } };
  } catch (error) { return { available: false, data: null, error: error instanceof Error ? error.message : "RDAP unavailable", source: { name: "RDAP", url, status: "unavailable", collectedAt } }; }
}

function extractRegistrar(entity: Record<string, unknown>): Record<string, unknown> { const vcard = entity.vcardArray; const card = Array.isArray(vcard) && Array.isArray(vcard[1]) ? vcard[1] as Array<unknown[]> : []; const values: Record<string, unknown> = {}; for (const item of card) { if (Array.isArray(item) && typeof item[0] === "string") values[item[0]] = item[3] ?? null; } return { handle: entity.handle ?? null, name: values.fn ?? values.org ?? null, email: values.email ?? null }; }
