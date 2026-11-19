export interface IpSourceReference { name: string; url: string; status: "available" | "unavailable"; collectedAt: string; }
export interface IpAvailability { available: boolean; error?: string; data?: Record<string, unknown>; }
export interface IpCollectionData {
  ip: string;
  classification: { version: 4 | 6; scope: string; isPublic: boolean; isPrivate: boolean; isReserved: boolean; isRoutable: boolean; description: string };
  geolocation: IpAvailability;
  registration: IpAvailability;
  reverseDns: IpAvailability & { data?: { hostnames: string[] } };
  intelligence: { abuseIpDb: IpAvailability; virusTotal: IpAvailability; shodan: IpAvailability };
  associatedDomains: string[];
  hosting: IpAvailability;
  sources: IpSourceReference[];
}
export interface IpResult { id: string; ip: string; status: string; data: IpCollectionData; sourceReferences: IpSourceReference[] | null; collectedAt: string; investigation: { id: string; name: string; status: string }; }
export interface IpHistoryItem { id: string; ip: string; status: string; collectedAt: string; investigation: { id: string; name: string; status: string }; }
