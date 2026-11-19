import { isIP } from "node:net";
import { AppError } from "../utils/appError";
import type { IpClassification } from "../types/ip";

export function normalizeIp(value: string): string {
  const trimmed = value.trim();
  const address = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;
  if (address.includes("%") || isIP(address) === 0) throw new AppError(400, "Enter a valid IPv4 or IPv6 address", "INVALID_IP");
  return address.toLowerCase();
}

export function classifyIp(address: string): IpClassification {
  const version = isIP(address) as 4 | 6;
  if (version === 4) return classifyIpv4(address);
  const numeric = ipv6Number(address);
  if ((numeric >> 32n) === 0xffffn) {
    const mapped = classifyIpv4(numberToIpv4(Number(numeric & 0xffffffffn)));
    return { ...mapped, version: 6, description: `IPv4-mapped IPv6 address · ${mapped.description}` };
  }

  if (numeric === 0n) return classification(6, "reserved", "Unspecified IPv6 address");
  if (numeric === 1n) return classification(6, "loopback", "IPv6 loopback address");
  if (inCidr6(numeric, "fc00::", 7)) return classification(6, "private", "Unique local IPv6 address");
  if (inCidr6(numeric, "fe80::", 10)) return classification(6, "link-local", "IPv6 link-local address");
  if (inCidr6(numeric, "ff00::", 8)) return classification(6, "multicast", "IPv6 multicast address");
  if (inCidr6(numeric, "2001:db8::", 32)) return classification(6, "documentation", "IPv6 documentation range");
  if (inCidr6(numeric, "3fff::", 20)) return classification(6, "documentation", "IPv6 documentation range");
  if (inCidr6(numeric, "64:ff9b::", 96)) return classification(6, "public", "Globally reachable IPv4-IPv6 translation address");
  if (inCidr6(numeric, "2001:1::1", 128) || inCidr6(numeric, "2001:1::2", 128) || inCidr6(numeric, "2001:1::3", 128) || inCidr6(numeric, "2001:3::", 32) || inCidr6(numeric, "2001:4:112::", 48) || inCidr6(numeric, "2001:20::", 28) || inCidr6(numeric, "2001:30::", 28)) return classification(6, "public", "Globally reachable IPv6 special purpose address");
  if (inCidr6(numeric, "2001::", 23) || inCidr6(numeric, "2002::", 16) || inCidr6(numeric, "64:ff9b:1::", 48) || inCidr6(numeric, "5f00::", 16)) return classification(6, "reserved", "IPv6 special purpose range");
  if (!inCidr6(numeric, "2000::", 3)) return classification(6, "reserved", "IPv6 address is outside the global unicast range");
  return classification(6, "public", "Globally routable IPv6 address");
}

function classifyIpv4(address: string): IpClassification {
  const value = address.split(".").reduce((total, octet) => (total << 8n) + BigInt(octet), 0n);
  if (address === "192.0.0.9" || address === "192.0.0.10" || inCidr4(value, "192.31.196.0", 24) || inCidr4(value, "192.52.193.0", 24) || inCidr4(value, "192.175.48.0", 24)) return classification(4, "public", "Globally reachable IETF anycast or service address");
  const ranges: Array<[string, number, IpClassification["scope"], string]> = [
    ["0.0.0.0", 8, "reserved", "Current network or unspecified range"],
    ["10.0.0.0", 8, "private", "Private network range"],
    ["100.64.0.0", 10, "shared", "Shared carrier-grade NAT range"],
    ["127.0.0.0", 8, "loopback", "IPv4 loopback range"],
    ["169.254.0.0", 16, "link-local", "IPv4 link-local range"],
    ["172.16.0.0", 12, "private", "Private network range"],
    ["192.0.0.0", 24, "reserved", "IETF protocol assignment range"],
    ["192.0.2.0", 24, "documentation", "IPv4 documentation range"],
    ["192.88.99.0", 24, "reserved", "Deprecated relay anycast range"],
    ["192.168.0.0", 16, "private", "Private network range"],
    ["198.18.0.0", 15, "reserved", "Network benchmark range"],
    ["198.51.100.0", 24, "documentation", "IPv4 documentation range"],
    ["203.0.113.0", 24, "documentation", "IPv4 documentation range"],
    ["224.0.0.0", 4, "multicast", "IPv4 multicast range"],
    ["240.0.0.0", 4, "reserved", "Reserved and limited broadcast range"],
  ];
  for (const [network, prefix, scope, description] of ranges) if (inCidr4(value, network, prefix)) return classification(4, scope, description);
  return classification(4, "public", "Globally routable IPv4 address");
}

function classification(version: 4 | 6, scope: IpClassification["scope"], description: string): IpClassification {
  const isPublic = scope === "public";
  const isPrivate = scope === "private";
  return { version, scope, isPublic, isPrivate, isReserved: !isPublic && !isPrivate, isRoutable: isPublic, description };
}

function inCidr4(value: bigint, network: string, prefix: number): boolean {
  const base = network.split(".").reduce((total, octet) => (total << 8n) + BigInt(octet), 0n);
  const shift = BigInt(32 - prefix);
  return (value >> shift) === (base >> shift);
}

function ipv6Number(address: string): bigint {
  const withGroups = address.includes(".") ? replaceEmbeddedIpv4(address) : address;
  const [leftRaw, rightRaw = ""] = withGroups.split("::");
  const left = leftRaw ? leftRaw.split(":") : [];
  const right = rightRaw ? rightRaw.split(":") : [];
  const zeros = Array.from({ length: Math.max(0, 8 - left.length - right.length) }, () => "0");
  return [...left, ...zeros, ...right].reduce((total, group) => (total << 16n) + BigInt(`0x${group || "0"}`), 0n);
}

function replaceEmbeddedIpv4(address: string): string {
  const lastColon = address.lastIndexOf(":");
  const octets = address.slice(lastColon + 1).split(".").map(Number);
  const high = ((octets[0] << 8) | octets[1]).toString(16);
  const low = ((octets[2] << 8) | octets[3]).toString(16);
  return `${address.slice(0, lastColon + 1)}${high}:${low}`;
}

function inCidr6(value: bigint, network: string, prefix: number): boolean {
  const base = ipv6Number(network);
  const shift = BigInt(128 - prefix);
  return (value >> shift) === (base >> shift);
}

function numberToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}
