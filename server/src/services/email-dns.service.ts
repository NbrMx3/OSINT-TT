import { Resolver } from "node:dns/promises";

export interface EmailDnsBlock<T> {
  available: boolean;
  values: T[];
  error?: string;
}

export interface EmailDnsCollection {
  mx: EmailDnsBlock<{ exchange: string; priority: number }>;
  spf: EmailDnsBlock<string> & { analysis: { recordCount: number; mechanisms: string[]; dnsLookupMechanismCount: number; notes: string[] } };
  dmarc: EmailDnsBlock<string> & { policy: Record<string, string> | null };
  dkim: EmailDnsBlock<{ selector: string; record: string }> & { selectorsChecked: string[] };
}

const selectors = ["default", "selector1", "selector2", "google", "s1", "s2", "k1", "dkim", "mail", "protonmail"];

export async function collectEmailDns(domain: string): Promise<EmailDnsCollection> {
  const resolver = new Resolver({ timeout: 3500, tries: 1 });
  const [mxResult, rootTxtResult, dmarcResult, dkimResults] = await Promise.all([
    resolveRecords(() => resolver.resolveMx(domain), "No MX records returned"),
    resolveRecords(() => resolver.resolveTxt(domain), "No TXT records returned"),
    resolveRecords(() => resolver.resolveTxt(`_dmarc.${domain}`), "No DMARC record returned"),
    Promise.all(selectors.map(async (selector) => ({ selector, ...await resolveRecords(() => resolver.resolveTxt(`${selector}._domainkey.${domain}`), "No DKIM record for this selector") }))),
  ]);

  const mxValues = mxResult.available ? mxResult.values.map(({ exchange, priority }) => ({ exchange: exchange.replace(/\.$/, ""), priority })) : [];
  const txtValues = rootTxtResult.available ? rootTxtResult.values.map((chunks) => chunks.join("")) : [];
  const spfRecords = txtValues.filter((record) => /^v=spf1(?:\s|$)/i.test(record.trim()));
  const spfMechanisms = spfRecords.flatMap((record) => record.trim().split(/\s+/).slice(1));
  const lookupTerms = spfMechanisms.filter((term) => /^(?:[+?~-]?(?:include|a|mx|ptr|exists|redirect)(?::|=|$))/i.test(term));
  const spfNotes: string[] = [];
  if (spfRecords.length > 1) spfNotes.push("Multiple SPF records were found; receivers may treat this as a permanent error.");
  if (lookupTerms.length > 10) spfNotes.push("The record contains more than 10 DNS lookup mechanisms; recursive SPF evaluation was not performed.");
  if (spfRecords.length === 1 && !/(?:^|\s)[~-]?all(?:\s|$)/i.test(spfRecords[0])) spfNotes.push("No terminal all mechanism was found.");

  const dmarcValues = dmarcResult.available ? dmarcResult.values.map((chunks) => chunks.join("")) : [];
  const dmarcRecords = dmarcValues.filter((record) => /^v=DMARC1(?:\s*;|$)/i.test(record.trim()));
  const dkimRecords = dkimResults.flatMap((entry) => entry.available ? entry.values.map((chunks) => ({ selector: entry.selector, record: chunks.join("") })) : []);
  const dmarcRecord = dmarcRecords[0] ?? null;

  return {
    mx: { available: mxResult.available, values: mxValues, ...(mxResult.error ? { error: mxResult.error } : {}) },
    spf: { available: spfRecords.length > 0, values: spfRecords, analysis: { recordCount: spfRecords.length, mechanisms: spfMechanisms, dnsLookupMechanismCount: lookupTerms.length, notes: spfNotes }, ...(!spfRecords.length ? { error: "No SPF TXT record found" } : {}) },
    dmarc: { available: dmarcRecords.length > 0, values: dmarcRecords, policy: dmarcRecord ? parseDmarcPolicy(dmarcRecord) : null, ...(!dmarcRecords.length ? { error: dmarcResult.error ?? "No valid DMARC record found" } : {}) },
    dkim: { available: dkimRecords.length > 0, values: dkimRecords, selectorsChecked: selectors, ...(!dkimRecords.length ? { error: "No record found for the common selectors checked; the domain may use a custom selector" } : {}) },
  };
}

function parseDmarcPolicy(record: string): Record<string, string> {
  return Object.fromEntries(record.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
}

async function resolveRecords<T>(resolve: () => Promise<T[]>, emptyMessage: string): Promise<{ available: boolean; values: T[]; error?: string }> {
  try {
    const values = await resolve();
    return values.length ? { available: true, values } : { available: false, values: [], error: emptyMessage };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    const message = code === "ENODATA" || code === "ENOTFOUND" ? emptyMessage : error instanceof Error ? error.message : "DNS lookup unavailable";
    return { available: false, values: [], error: message };
  }
}
