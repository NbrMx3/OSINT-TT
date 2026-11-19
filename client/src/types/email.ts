export interface IntelligenceSource { name: string; url: string; status: "available" | "unavailable" | "not_requested"; collectedAt: string; detail?: string; }
export interface EmailDnsRecord<T> { available: boolean; values: T[]; error?: string; }
export interface EmailCollectionData {
  email: string;
  domain: string;
  collectedAt: string;
  dns: {
    mx: EmailDnsRecord<{ exchange: string; priority: number }>;
    spf: EmailDnsRecord<string> & { analysis: { recordCount: number; mechanisms: string[]; dnsLookupMechanismCount: number; notes: string[] } };
    dmarc: EmailDnsRecord<string> & { policy: Record<string, string> | null };
    dkim: EmailDnsRecord<{ selector: string; record: string }> & { selectorsChecked: string[] };
  };
  registration: { available: boolean; data: Record<string, unknown> | null; error?: string | null };
  breachExposure: { checked: boolean; available: boolean; breaches: Array<Record<string, unknown>>; error?: string | null };
  publicReferences: { checked: boolean; available: boolean; references: Array<{ repository?: string | null; repositoryUrl?: string | null; path?: string | null; url?: string | null }>; error?: string | null };
  sources: IntelligenceSource[];
}
export interface EmailResult { id: string; email: string; status: string; data: EmailCollectionData; sourceReferences: IntelligenceSource[] | null; collectedAt: string; investigation: { id: string; name: string; status: string }; }
export interface EmailHistoryItem { id: string; email: string; status: string; collectedAt: string; investigation: { id: string; name: string; status: string }; }
