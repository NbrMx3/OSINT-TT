import crypto from "node:crypto";
import { InvestigationCategory, InvestigationStatus, Prisma, RoleName, TargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { collectGithubProfile, collectRedditProfile } from "./username.service";

type Platform = "github" | "reddit" | "youtube";
type SourceStatus = "available" | "unavailable" | "not_requested";
export interface SocialSourceReference { name: string; url: string; status: SourceStatus; collectedAt: string; detail?: string; }
type PublicProfile = { platform: string; username: string; profileUrl: string; confidence: { score: number; level: string; method: string }; metadata: Record<string, unknown> };
type ContentReference = { platform: string; title: string; url: string; publishedAt: string | null; summary?: string | null };

export function normalizeSocialUsername(value: string): string {
  const username = value.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{1,50}$/.test(username)) throw new AppError(400, "Enter a public handle containing letters, numbers, dots, underscores, or hyphens", "INVALID_SOCIAL_USERNAME");
  return username;
}

export async function investigateSocial(input: { username: string; platforms: Platform[]; tenantId: string; userId: string; role: RoleName; investigationId?: string }) {
  const username = normalizeSocialUsername(input.username);
  const investigation = input.investigationId
    ? await prisma.investigation.findFirst({ where: { id: input.investigationId, tenantId: input.tenantId } })
    : await prisma.investigation.create({ data: {
      tenantId: input.tenantId, ownerId: input.userId, name: `Social intelligence: @${username}`,
      description: `Public social profile metadata and references for the handle @${username}`,
      category: InvestigationCategory.SOCIAL, selectedModules: input.platforms.map((platform) => `${platform} public API`), status: InvestigationStatus.PENDING,
      targets: { create: { type: TargetType.USERNAME, value: username } },
      activityLogs: { create: { tenantId: input.tenantId, userId: input.userId, action: "SOCIAL_INVESTIGATION_CREATED", entityType: "Investigation" } },
    } });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  if (investigation.category !== InvestigationCategory.SOCIAL) throw new AppError(400, "Investigation is not a social intelligence investigation", "INVALID_INVESTIGATION_CATEGORY");
  if (investigation.ownerId !== input.userId && input.role !== RoleName.ADMINISTRATOR) throw new AppError(403, "You can only add results to investigations you own", "INVESTIGATION_OWNERSHIP_REQUIRED");

  await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.RUNNING, progress: 10, startedAt: new Date(), failureReason: null } });
  try {
    const [github, reddit, youtube] = await Promise.all([
      input.platforms.includes("github") ? collectGithub(username) : notRequested("GitHub public API"),
      input.platforms.includes("reddit") ? collectReddit(username) : notRequested("Reddit public API"),
      input.platforms.includes("youtube") ? collectYoutube(username) : notRequested("YouTube Data API"),
    ]);
    const collectedAt = new Date().toISOString();
    const sources = [github.source, reddit.source, youtube.source];
    const profiles = [...github.profiles, ...reddit.profiles, ...youtube.profiles];
    const contentReferences = [...github.contentReferences, ...reddit.contentReferences, ...youtube.contentReferences];
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const data = {
      username, collectedAt, expiresAt: expiresAt.toISOString(), profiles, contentReferences, sources,
      confidenceNote: "Confidence describes only the public handle match returned by that platform. Matching handles do not establish that profiles belong to the same person.",
      retentionNote: "Provider data is retained for up to 30 days and then automatically deleted.",
    };
    const contentHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const evidence = sources.filter((source) => source.status === "available" && source.url).map((source) => ({
      tenantId: input.tenantId, sourceUrl: source.url, title: `${source.name} lookup for @${username}`, contentHash,
      metadata: { source: source.name, collectedAt: source.collectedAt },
    }));
    const result = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.socialIntelligenceResult.create({ data: {
        tenantId: input.tenantId, investigationId: investigation.id, username, status: "COMPLETED", expiresAt,
        data: data as unknown as Prisma.InputJsonValue, sourceReferences: sources as unknown as Prisma.InputJsonValue,
        evidence: { create: evidence },
      } });
      await transaction.investigation.update({ where: { id: investigation.id }, data: {
        status: InvestigationStatus.COMPLETED, progress: 100, completedAt: new Date(),
        results: { socialResultId: saved.id, profileCount: profiles.length, contentReferenceCount: contentReferences.length },
      } });
      await transaction.activityLog.create({ data: {
        tenantId: input.tenantId, userId: input.userId, investigationId: investigation.id,
        action: "SOCIAL_INTELLIGENCE_COMPLETED", entityType: "SocialIntelligenceResult", entityId: saved.id,
        metadata: { username, profileCount: profiles.length, sourceCount: sources.length, expiresAt: expiresAt.toISOString() },
      } });
      return saved;
    });
    return { investigationId: investigation.id, result };
  } catch (error) {
    await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.FAILED, failureReason: error instanceof Error ? error.message : "Social intelligence collection failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function getSocialResult(id: string, tenantId: string) {
  const result = await prisma.socialIntelligenceResult.findFirst({
    where: { id, tenantId, expiresAt: { gt: new Date() } },
    include: {
      investigation: { select: { id: true, name: true, status: true } },
      evidence: { select: { id: true, sourceUrl: true, title: true, contentHash: true, collectedAt: true } },
    },
  });
  if (!result) throw new AppError(404, "Social intelligence result not found or expired", "SOCIAL_RESULT_NOT_FOUND");
  return result;
}

export async function listSocialHistory(tenantId: string, value?: string) {
  const username = value ? normalizeSocialUsername(value) : undefined;
  return prisma.socialIntelligenceResult.findMany({
    where: { tenantId, expiresAt: { gt: new Date() }, ...(username ? { username } : {}) },
    select: { id: true, username: true, status: true, collectedAt: true, expiresAt: true, investigation: { select: { id: true, name: true, status: true } } },
    orderBy: { collectedAt: "desc" }, take: 50,
  });
}

async function collectGithub(username: string) {
  const result = await collectGithubProfile(username, false);
  const profiles = result.profiles as PublicProfile[];
  const contentReferences: ContentReference[] = [];
  const exactProfile = profiles.find((profile) => profile.username.toLowerCase() === username.toLowerCase());
  if (exactProfile) {
    try {
      const apiUrl = new URL(`https://api.github.com/users/${encodeURIComponent(exactProfile.username)}/repos`);
      apiUrl.search = new URLSearchParams({ sort: "updated", direction: "desc", per_page: "10", type: "owner" }).toString();
      const repositories = await requestJson<Array<Record<string, unknown>>>(apiUrl, {
        accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "OSINT-X/1.0",
      }, 512 * 1024);
      for (const repository of repositories) {
        const url = publicHttpsUrl(repository.html_url, "github.com");
        if (!url || repository.private === true) continue;
        contentReferences.push({
          platform: "GitHub", title: String(repository.full_name ?? repository.name ?? "Public repository").slice(0, 200),
          url, publishedAt: typeof repository.updated_at === "string" ? repository.updated_at : null,
          summary: typeof repository.description === "string" ? repository.description.slice(0, 500) : null,
        });
      }
    } catch {
      // Keep the public profile result if the optional repository list is unavailable.
    }
  }
  return { profiles, contentReferences, source: { ...result.source, collectedAt: result.source.collectedAt } as SocialSourceReference };
}

async function collectReddit(username: string) {
  const result = await collectRedditProfile(username);
  const profiles = result.profiles as PublicProfile[];
  return {
    profiles,
    contentReferences: [] as ContentReference[],
    source: {
      ...result.source,
      detail: result.source.status === "available"
        ? "Public profile metadata only. Post content is not retained by this integration."
        : result.source.detail,
    } as SocialSourceReference,
  };
}

async function collectYoutube(username: string) {
  const collectedAt = new Date().toISOString();
  const handle = username.replace(/^@/, "");
  const profileUrl = `https://www.youtube.com/@${encodeURIComponent(handle)}`;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return {
    profiles: [] as PublicProfile[], contentReferences: [] as ContentReference[],
    source: { name: "YouTube Data API", url: profileUrl, status: "unavailable" as const, collectedAt, detail: "YOUTUBE_API_KEY is not configured." },
  };
  try {
    const channelUrl = new URL("https://youtube.googleapis.com/youtube/v3/channels");
    channelUrl.search = new URLSearchParams({ part: "snippet,statistics,contentDetails", forHandle: handle, key: apiKey }).toString();
    const channelData = await requestJson<{ items?: Array<Record<string, unknown>> }>(channelUrl, { accept: "application/json" }, 512 * 1024);
    const channel = channelData.items?.[0];
    if (!channel) return {
      profiles: [] as PublicProfile[], contentReferences: [] as ContentReference[],
      source: { name: "YouTube Data API", url: profileUrl, status: "available" as const, collectedAt, detail: "No public channel matched this handle." },
    };
    const id = String(channel.id ?? "");
    const snippet = (channel.snippet ?? {}) as Record<string, unknown>;
    const statistics = (channel.statistics ?? {}) as Record<string, unknown>;
    const contentDetails = (channel.contentDetails ?? {}) as Record<string, unknown>;
    const related = (contentDetails.relatedPlaylists ?? {}) as Record<string, unknown>;
    const uploads = typeof related.uploads === "string" ? related.uploads : "";
    const channelPage = id ? `https://www.youtube.com/channel/${encodeURIComponent(id)}` : profileUrl;
    const hiddenSubscribers = statistics.hiddenSubscriberCount === true;
    const profiles: PublicProfile[] = [{
      platform: "YouTube", username: typeof snippet.customUrl === "string" ? snippet.customUrl.replace(/^@/, "") : handle, profileUrl: channelPage,
      confidence: { score: 100, level: "high", method: "YouTube channels.list returned a channel for the supplied handle; this is a handle match, not an identity match." },
      metadata: {
        title: snippet.title ?? null, description: snippet.description ?? null, country: snippet.country ?? null,
        publishedAt: snippet.publishedAt ?? null, subscriberCount: hiddenSubscribers ? null : statistics.subscriberCount ?? null,
        videoCount: statistics.videoCount ?? null, viewCount: statistics.viewCount ?? null, customUrl: snippet.customUrl ?? null,
      },
    }];
    const contentReferences: ContentReference[] = [];
    if (uploads) {
      const playlistUrl = new URL("https://youtube.googleapis.com/youtube/v3/playlistItems");
      playlistUrl.search = new URLSearchParams({ part: "snippet,contentDetails", playlistId: uploads, maxResults: "10", key: apiKey }).toString();
      const playlist = await requestJson<{ items?: Array<Record<string, unknown>> }>(playlistUrl, { accept: "application/json" }, 512 * 1024);
      for (const item of playlist.items ?? []) {
        const itemSnippet = (item.snippet ?? {}) as Record<string, unknown>;
        const details = (item.contentDetails ?? {}) as Record<string, unknown>;
        const videoId = String(details.videoId ?? "");
        if (!videoId) continue;
        contentReferences.push({
          platform: "YouTube", title: String(itemSnippet.title ?? "Public video").slice(0, 200),
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
          publishedAt: typeof details.videoPublishedAt === "string" ? details.videoPublishedAt : typeof itemSnippet.publishedAt === "string" ? itemSnippet.publishedAt : null,
        });
      }
    }
    return { profiles, contentReferences, source: { name: "YouTube Data API", url: channelPage, status: "available" as const, collectedAt } };
  } catch (error) {
    return {
      profiles: [] as PublicProfile[], contentReferences: [] as ContentReference[],
      source: { name: "YouTube Data API", url: profileUrl, status: "unavailable" as const, collectedAt, detail: safeProviderError(error) },
    };
  }
}

async function requestJson<T>(url: URL, headers: Record<string, string>, maxBytes: number): Promise<T> {
  const approvedHosts = new Set(["api.github.com", "youtube.googleapis.com"]);
  if (url.protocol !== "https:" || url.port && url.port !== "443" || !approvedHosts.has(url.hostname) || url.username || url.password) {
    throw new Error("Request target is outside the approved public API hosts");
  }
  const response = await fetch(url, { headers, redirect: "error", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Public API returned HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new Error("Public API response exceeded the configured size limit");
  return JSON.parse(Buffer.from(bytes).toString("utf8")) as T;
}

function publicHttpsUrl(value: unknown, hostname: string): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === hostname ? url.toString() : null; }
  catch { return null; }
}

function notRequested(name: string) {
  return { profiles: [] as PublicProfile[], contentReferences: [] as ContentReference[], source: { name, url: "", status: "not_requested" as const, collectedAt: new Date().toISOString() } };
}

function safeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Public API is unavailable";
  return message.replace(/([?&]key=)[^&\s]+/gi, "$1[redacted]").slice(0, 240);
}
