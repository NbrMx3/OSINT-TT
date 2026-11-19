export interface IpSourceReference {
  name: string;
  url: string;
  status: "available" | "unavailable";
  collectedAt: string;
}

export interface IpAvailability<T = Record<string, unknown>> {
  available: boolean;
  data?: T;
  error?: string;
}

export interface IpClassification {
  version: 4 | 6;
  scope: "public" | "private" | "loopback" | "link-local" | "shared" | "multicast" | "documentation" | "reserved";
  isPublic: boolean;
  isPrivate: boolean;
  isReserved: boolean;
  isRoutable: boolean;
  description: string;
}

export interface IpCollectionData {
  ip: string;
  classification: IpClassification;
  geolocation: IpAvailability;
  registration: IpAvailability;
  reverseDns: IpAvailability<{ hostnames: string[] }>;
  intelligence: {
    abuseIpDb: IpAvailability;
    virusTotal: IpAvailability;
    shodan: IpAvailability;
  };
  associatedDomains: string[];
  hosting: IpAvailability;
  sources: IpSourceReference[];
}
