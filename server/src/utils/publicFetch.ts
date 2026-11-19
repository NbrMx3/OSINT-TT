import dns from "node:dns/promises";
import net from "node:net";
import { AppError } from "./appError";

const MAX_REDIRECTS = 3;

export async function fetchPublicUrl(input: string, init: RequestInit = {}): Promise<Response> {
  let url = input;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicUrl(url);
    const response = await fetch(url, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) {
      await assertPublicUrl(response.url || url);
      return response;
    }
    const location = response.headers.get("location");
    if (!location) return response;
    url = new URL(location, url).toString();
  }
  throw new AppError(400, "The requested URL redirected too many times", "URL_REDIRECT_LIMIT");
}

export async function assertPublicUrl(input: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new AppError(400, "A valid URL is required", "INVALID_URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) {
    throw new AppError(400, "Only public HTTP(S) URLs without credentials or custom ports are allowed", "UNSAFE_URL");
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const addresses = net.isIP(hostname) ? [hostname] : (await dns.lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new AppError(400, "The requested host is not a public address", "UNSAFE_URL");
  }
}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const octets = address.split(".").map(Number);
    return octets[0] === 10 || octets[0] === 127 || octets[0] === 0 || (octets[0] === 169 && octets[1] === 254)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 192 && octets[1] === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd")
    || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
}
