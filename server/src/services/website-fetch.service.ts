import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import tls from "node:tls";
import { AppError } from "../utils/appError";

const blockedRanges = new BlockList();
const ipv6GlobalUnicast = new BlockList();

for (const [network, prefix, family] of [
  ["0.0.0.0", 8, "ipv4"], ["10.0.0.0", 8, "ipv4"], ["100.64.0.0", 10, "ipv4"], ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"], ["172.16.0.0", 12, "ipv4"], ["192.0.0.0", 24, "ipv4"], ["192.0.2.0", 24, "ipv4"],
  ["192.88.99.0", 24, "ipv4"], ["192.168.0.0", 16, "ipv4"], ["198.18.0.0", 15, "ipv4"], ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"], ["224.0.0.0", 4, "ipv4"], ["240.0.0.0", 4, "ipv4"],
  ["2001::", 23, "ipv6"], ["2001:db8::", 32, "ipv6"], ["2002::", 16, "ipv6"], ["3fff::", 20, "ipv6"],
] as const) blockedRanges.addSubnet(network, prefix, family);
ipv6GlobalUnicast.addSubnet("2000::", 3, "ipv6");

const internalSuffixes = [".localhost", ".local", ".internal", ".test", ".invalid", ".example"];
const maxRedirects = 4;
const requestTimeoutMs = 8_000;
const maxPageBytes = 512 * 1024;

export interface TlsDetails {
  authorized: boolean;
  authorizationError: string | null;
  protocol: string | null;
  cipher: string | null;
  certificate: { subject: string | null; issuer: string | null; validFrom: string | null; validTo: string | null; fingerprint256: string | null; subjectAltName: string | null } | null;
}

export interface PublicHttpResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  redirects: string[];
  tls: TlsDetails | null;
}

export function normalizeWebsiteUrl(input: string): URL {
  const value = input.trim();
  if (!value || value.length > 2048 || /[\r\n\0]/.test(value)) throw new AppError(400, "Enter a valid public website URL", "INVALID_WEBSITE_URL");
  let url: URL;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`); }
  catch { throw new AppError(400, "Enter a valid public website URL", "INVALID_WEBSITE_URL"); }
  validateUrlShape(url);
  return url;
}

export function sanitizeUrlForStorage(value: string | URL): string {
  const url = value instanceof URL ? new URL(value.toString()) : new URL(value);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function fetchPublicUrl(input: string | URL, maxBytes = maxPageBytes): Promise<PublicHttpResponse> {
  let current = input instanceof URL ? new URL(input.toString()) : new URL(input);
  const seen = new Set<string>();
  const redirects: string[] = [];
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    validateUrlShape(current);
    if (seen.has(current.toString())) throw new Error("Website redirect loop detected");
    seen.add(current.toString());
    const address = await resolvePublicAddress(current.hostname.replace(/^\[|\]$/g, ""));
    const response = await requestPinned(current, address, maxBytes);
    const location = response.headers.location;
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      if (hop === maxRedirects) throw new Error("Website exceeded the redirect limit");
      const destination = new URL(location, current);
      validateUrlShape(destination);
      redirects.push(sanitizeUrlForStorage(destination));
      current = destination;
      continue;
    }
    return { ...response, redirects };
  }
  throw new Error("Website exceeded the redirect limit");
}

function validateUrlShape(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new AppError(400, "Only HTTP and HTTPS website URLs are supported", "INVALID_WEBSITE_URL");
  if (url.username || url.password) throw new AppError(400, "Website URLs cannot contain credentials", "INVALID_WEBSITE_URL");
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  if ((port !== 80 && port !== 443) || (url.protocol === "https:" && port !== 443) || (url.protocol === "http:" && port !== 80)) throw new AppError(400, "Only standard HTTP and HTTPS ports are allowed", "INVALID_WEBSITE_PORT");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || internalSuffixes.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))) throw new AppError(400, "Local and reserved hostnames are not allowed", "BLOCKED_WEBSITE_HOST");
  const family = isIP(hostname);
  if (!family && !hostname.includes(".")) throw new AppError(400, "A fully qualified public hostname is required", "BLOCKED_WEBSITE_HOST");
  if (family && !isPublicAddress(hostname, family)) throw new AppError(400, "Private, loopback, and reserved network addresses are blocked", "BLOCKED_WEBSITE_ADDRESS");
}

async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const family = isIP(hostname);
  if (family === 4 || family === 6) {
    if (!isPublicAddress(hostname, family)) throw new AppError(400, "Private, loopback, and reserved network addresses are blocked", "BLOCKED_WEBSITE_ADDRESS");
    return { address: hostname, family };
  }
  const resolver = new dns.Resolver({ timeout: 3500, tries: 1 });
  const [v4, v6] = await Promise.all([
    resolver.resolve4(hostname).catch(() => [] as string[]),
    resolver.resolve6(hostname).catch(() => [] as string[]),
  ]);
  const addresses = [...v4.map((address) => ({ address, family: 4 as const })), ...v6.map((address) => ({ address, family: 6 as const }))];
  if (!addresses.length) throw new Error("Website hostname did not resolve to an address");
  if (addresses.length > 32) throw new Error("Website hostname returned too many DNS answers");
  if (addresses.some(({ address, family: addressFamily }) => !isPublicAddress(address, addressFamily))) throw new AppError(400, "Website hostname resolves to a private or reserved address and was blocked", "BLOCKED_WEBSITE_ADDRESS");
  return addresses[0];
}

function isPublicAddress(address: string, family: number): boolean {
  if (family === 4) return !blockedRanges.check(address, "ipv4");
  if (family === 6) return ipv6GlobalUnicast.check(address, "ipv6") && !blockedRanges.check(address, "ipv6");
  return false;
}

function requestPinned(url: URL, pinned: { address: string; family: 4 | 6 }, maxBytes: number): Promise<PublicHttpResponse> {
  return new Promise((resolve, reject) => {
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const lookup = (requestedHost: string, options: { all?: boolean }, callback: (error: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void) => {
      if (requestedHost.replace(/^\[|\]$/g, "").toLowerCase() !== hostname) return callback(new Error("Unexpected outbound hostname") as NodeJS.ErrnoException, "", 0);
      if (options?.all) return callback(null, [{ address: pinned.address, family: pinned.family }]);
      return callback(null, pinned.address, pinned.family);
    };
    const client = url.protocol === "https:" ? https : http;
    let settled = false;
    const finishWithError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    };
    const timeout = setTimeout(() => request.destroy(new Error("Website request timed out")), requestTimeoutMs);
    timeout.unref();
    const request = client.request(url, {
      method: "GET",
      headers: { accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.8,*/*;q=0.2", "accept-encoding": "identity", "user-agent": "OSINT-X public website metadata collector/1.0" },
      lookup,
      ...(url.protocol === "https:" ? { rejectUnauthorized: false } : {}),
      ...(url.protocol === "https:" && !isIP(hostname) ? { servername: hostname } : {}),
    }, (response) => {
      const headers = Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(", ") : value ?? ""]));
      const contentLength = Number(headers["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > maxBytes) return response.destroy(new Error("Website response exceeds the configured size limit"));
      const tlsDetails = response.socket instanceof tls.TLSSocket ? readTlsDetails(response.socket) : null;
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > maxBytes) return response.destroy(new Error("Website response exceeds the configured size limit"));
        chunks.push(buffer);
      });
      response.on("error", finishWithError);
      response.on("end", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({ url: url.toString(), status: response.statusCode ?? 0, statusText: response.statusMessage ?? "", headers, body: Buffer.concat(chunks).toString("utf8"), redirects: [], tls: tlsDetails });
      });
    });
    request.on("error", finishWithError);
    request.end();
  });
}

function readTlsDetails(socket: tls.TLSSocket): TlsDetails {
  const certificate = socket.getPeerCertificate();
  const subject = certificate.subject && Object.keys(certificate.subject).length ? certificate.subject : null;
  const issuer = certificate.issuer && Object.keys(certificate.issuer).length ? certificate.issuer : null;
  return {
    authorized: socket.authorized,
    authorizationError: socket.authorizationError ? String(socket.authorizationError) : null,
    protocol: socket.getProtocol() ?? null,
    cipher: socket.getCipher()?.name ?? null,
    certificate: certificate.raw ? {
      subject: subject ? JSON.stringify(subject) : null,
      issuer: issuer ? JSON.stringify(issuer) : null,
      validFrom: certificate.valid_from ?? null,
      validTo: certificate.valid_to ?? null,
      fingerprint256: certificate.fingerprint256 ?? null,
      subjectAltName: certificate.subjectaltname ?? null,
    } : null,
  };
}
