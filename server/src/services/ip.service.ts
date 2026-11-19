import crypto from "node:crypto";
import { InvestigationCategory, InvestigationStatus, Prisma, TargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { IpAvailability, IpCollectionData, IpSourceReference } from "../types/ip";
import { AppError } from "../utils/appError";
import { classifyIp, normalizeIp } from "./ip-validation.service";
import { collectIpGeolocation, collectIpRegistration, collectReverseDns, sourceRef } from "./ip-lookup.service";
import { collectIpThreatIntelligence } from "./ip-threat.service";

export async function investigateIp(input: { ip: string; tenantId: string; userId: string; investigationId?: string }) {
  const ip = normalizeIp(input.ip);
  const classification = classifyIp(ip);
  const investigation = input.investigationId
    ? await prisma.investigation.findFirst({ where: { id: input.investigationId, tenantId: input.tenantId } })
    : await prisma.investigation.create({
      data: {
        tenantId: input.tenantId,
        ownerId: input.userId,
        name: `IP intelligence · ${ip}`,
        description: `Public IP intelligence collection for ${ip}`,
        category: InvestigationCategory.IP,
        selectedModules: ["Classification", "Geolocation", "RDAP", "Reverse DNS", "AbuseIPDB", "VirusTotal", "Shodan"],
        status: InvestigationStatus.PENDING,
        targets: { create: { type: TargetType.IP, value: ip } },
        activityLogs: { create: { tenantId: input.tenantId, userId: input.userId, action: "IP_INVESTIGATION_CREATED", entityType: "Investigation" } },
      },
    });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  if (investigation.category !== InvestigationCategory.IP) throw new AppError(400, "Investigation is not an IP investigation", "INVALID_INVESTIGATION_CATEGORY");

  await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.RUNNING, progress: 10, startedAt: new Date(), failureReason: null } });
  try {
    const collected = classification.isPublic
      ? await collectPublicIpData(ip)
      : unavailablePublicLookups(ip, classification.description);
    const domainValues: unknown[] = [
      collected.reverseDns.data?.hostnames,
      collected.intelligence.abuseIpDb.data?.hostnames,
      collected.intelligence.abuseIpDb.data?.domain,
      collected.intelligence.virusTotal.data?.resolutions,
      collected.intelligence.shodan.data?.hostnames,
      collected.intelligence.shodan.data?.domains,
    ];
    const associatedDomains = [...new Set(domainValues.flatMap((value) => {
      const values = Array.isArray(value) ? value : [value];
      return values.flatMap((item) => typeof item === "string" ? [item] : item && typeof item === "object" && "domain" in item && typeof item.domain === "string" ? [item.domain] : []);
    }))];
    const data: IpCollectionData = {
      ip,
      classification,
      geolocation: collected.geolocation,
      registration: collected.registration,
      reverseDns: collected.reverseDns,
      intelligence: collected.intelligence,
      associatedDomains,
      hosting: deriveHosting(collected.geolocation, collected.intelligence.shodan),
      sources: collected.sources,
    };
    const result = await prisma.$transaction(async (transaction) => {
      const contentHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
      const evidence = data.sources.filter((source) => source.status === "available").map((source) => ({
        tenantId: input.tenantId,
        sourceUrl: source.url,
        title: `${source.name} result for ${ip}`,
        contentHash,
        metadata: { source: source.name, collectedAt: source.collectedAt },
      }));
      const saved = await transaction.ipIntelligenceResult.create({
        data: {
          tenantId: input.tenantId,
          investigationId: investigation.id,
          ip,
          status: "COMPLETED",
          data: data as unknown as Prisma.InputJsonValue,
          sourceReferences: data.sources as unknown as Prisma.InputJsonValue,
          evidence: { create: evidence },
        },
      });
      await transaction.investigation.update({
        where: { id: investigation.id },
        data: { status: InvestigationStatus.COMPLETED, progress: 100, completedAt: new Date(), results: { ipResultId: saved.id, message: "IP intelligence collected from passive public sources." } },
      });
      await transaction.activityLog.create({
        data: { tenantId: input.tenantId, userId: input.userId, investigationId: investigation.id, action: "IP_INTELLIGENCE_COMPLETED", entityType: "IpIntelligenceResult", entityId: saved.id, metadata: { ip, publicAddress: classification.isPublic, sourceCount: data.sources.length } },
      });
      return saved;
    });
    return { investigationId: investigation.id, result };
  } catch (error) {
    await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.FAILED, failureReason: error instanceof Error ? error.message : "IP intelligence collection failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function getIpResult(id: string, tenantId: string) {
  const result = await prisma.ipIntelligenceResult.findFirst({
    where: { id, tenantId },
    include: { investigation: { select: { id: true, name: true, status: true } }, evidence: { select: { id: true, sourceUrl: true, title: true, contentHash: true, collectedAt: true } } },
  });
  if (!result) throw new AppError(404, "IP intelligence result not found", "IP_RESULT_NOT_FOUND");
  return result;
}

export async function listIpHistory(tenantId: string, address?: string) {
  const ip = address ? normalizeIp(address) : undefined;
  return prisma.ipIntelligenceResult.findMany({
    where: { tenantId, ...(ip ? { ip } : {}) },
    select: { id: true, ip: true, status: true, collectedAt: true, investigation: { select: { id: true, name: true, status: true } } },
    orderBy: { collectedAt: "desc" },
    take: 50,
  });
}

async function collectPublicIpData(ip: string) {
  const [geolocation, registration, reverseDns, providers] = await Promise.all([
    collectIpGeolocation(ip),
    collectIpRegistration(ip),
    collectReverseDns(ip),
    collectIpThreatIntelligence(ip),
  ]);
  const sources: IpSourceReference[] = [geolocation.source, registration.source, reverseDns.source, ...providers.sources];
  return {
    geolocation: { available: geolocation.available, ...(geolocation.data ? { data: geolocation.data } : {}), ...(!geolocation.available && "error" in geolocation ? { error: geolocation.error } : {}) },
    registration: { available: registration.available, ...(registration.data ? { data: registration.data } : {}), ...(!registration.available && "error" in registration ? { error: registration.error } : {}) },
    reverseDns: { available: reverseDns.available, ...(reverseDns.data ? { data: reverseDns.data } : {}), ...(!reverseDns.available ? { error: reverseDns.error } : {}) },
    intelligence: { abuseIpDb: providers.abuseIpDb.result, virusTotal: providers.virusTotal.result, shodan: providers.shodan.result },
    sources,
  };
}

function unavailablePublicLookups(ip: string, reason: string) {
  const sourceList = [
    sourceRef("IP geolocation (ipwho.is)", `https://ipwho.is/${encodeURIComponent(ip)}`),
    sourceRef("RDAP network registration", `https://rdap.org/ip/${encodeURIComponent(ip)}`),
    sourceRef("Reverse DNS (PTR)", `dns://${ip}`),
    sourceRef("AbuseIPDB", "https://api.abuseipdb.com/api/v2/check"),
    sourceRef("VirusTotal IP report and resolutions", `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`),
    sourceRef("Shodan passive host database", `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?minify=true`),
  ].map((source) => ({ ...source, status: "unavailable" as const }));
  const skipped: IpAvailability = { available: false, error: `Lookup skipped: ${reason}` };
  return {
    geolocation: skipped,
    registration: skipped,
    reverseDns: { ...skipped, data: { hostnames: [] } },
    intelligence: { abuseIpDb: skipped, virusTotal: skipped, shodan: skipped },
    sources: sourceList,
  };
}

function deriveHosting(geolocation: IpAvailability, shodan: IpAvailability): IpAvailability {
  const geo = geolocation.data;
  const host = shodan.data;
  const hosting = geo && typeof geo.hosting === "boolean" ? geo.hosting : null;
  const data = {
    provider: (host?.organization ?? host?.isp ?? geo?.organisation ?? geo?.isp) ?? null,
    isp: geo?.isp ?? host?.isp ?? null,
    organisation: geo?.organisation ?? host?.organization ?? null,
    asn: geo?.asn ?? host?.asn ?? null,
    hostingNetwork: hosting,
    shodanTags: host?.tags ?? [],
  };
  const available = Boolean(geo || host);
  return { available, ...(available ? { data } : {}), ...(!available ? { error: "Hosting provider information unavailable from configured sources" } : {}) };
}
