import crypto from "node:crypto";
import { InvestigationCategory, InvestigationStatus, Prisma, RoleName, TargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";

type Platform = "github" | "reddit";
type SourceStatus = "available" | "unavailable" | "not_requested";
export interface UsernameSourceReference { name: string; url: string; status: SourceStatus; collectedAt: string; detail?: string; }

export function normalizeUsername(value: string): string {
  const username = value.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{1,39}$/.test(username)) throw new AppError(400, "Enter a username containing 1–39 letters, numbers, underscores, or hyphens", "INVALID_USERNAME");
  return username;
}

export async function investigateUsername(input: { username: string; tenantId: string; userId: string; role: RoleName; investigationId?: string; platforms: Platform[] }) {
  const username = normalizeUsername(input.username);
  const investigation = input.investigationId
    ? await prisma.investigation.findFirst({ where: { id: input.investigationId, tenantId: input.tenantId } })
    : await prisma.investigation.create({ data: {
      tenantId: input.tenantId, ownerId: input.userId, name: `Username intelligence: ${username}`, description: `Public profile lookup for the handle ${username}`,
      category: InvestigationCategory.USERNAME, selectedModules: input.platforms.map((platform) => platform === "github" ? "GitHub public profile" : "Reddit public profile"), status: InvestigationStatus.PENDING,
      targets: { create: { type: TargetType.USERNAME, value: username } }, activityLogs: { create: { tenantId: input.tenantId, userId: input.userId, action: "USERNAME_INVESTIGATION_CREATED", entityType: "Investigation" } },
    } });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  if (investigation.category !== InvestigationCategory.USERNAME) throw new AppError(400, "Investigation is not a username investigation", "INVALID_INVESTIGATION_CATEGORY");
  if (investigation.ownerId !== input.userId && input.role !== RoleName.ADMINISTRATOR) throw new AppError(403, "You can only add results to investigations you own", "INVESTIGATION_OWNERSHIP_REQUIRED");

  await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.RUNNING, progress: 10, startedAt: new Date(), failureReason: null } });
  try {
    const [github, reddit] = await Promise.all([
      input.platforms.includes("github") ? lookupGithub(username) : notRequested("GitHub public profile"),
      input.platforms.includes("reddit") ? lookupReddit(username) : notRequested("Reddit public profile"),
    ]);
    const collectedAt = new Date().toISOString();
    const profiles = [...github.profiles, ...reddit.profiles];
    const sources = [github.source, reddit.source];
    const data = {
      username,
      collectedAt,
      profiles,
      sources,
      confidenceMethod: "Confidence measures the public profile handle match only; it does not establish that profiles on different platforms belong to the same person.",
    };
    const contentHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const evidence = sources.filter((source) => source.status === "available" && source.url).map((source) => ({ tenantId: input.tenantId, sourceUrl: source.url, title: `${source.name} lookup for ${username}`, contentHash, metadata: { source: source.name, collectedAt: source.collectedAt } }));
    const result = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.usernameIntelligenceResult.create({ data: { tenantId: input.tenantId, investigationId: investigation.id, username, status: "COMPLETED", data: data as unknown as Prisma.InputJsonValue, sourceReferences: sources as unknown as Prisma.InputJsonValue, evidence: { create: evidence } } });
      await transaction.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.COMPLETED, progress: 100, completedAt: new Date(), results: { usernameResultId: saved.id, profileCount: profiles.length } } });
      await transaction.activityLog.create({ data: { tenantId: input.tenantId, userId: input.userId, investigationId: investigation.id, action: "USERNAME_INTELLIGENCE_COMPLETED", entityType: "UsernameIntelligenceResult", entityId: saved.id, metadata: { username, profileCount: profiles.length, sourceCount: sources.length } } });
      return saved;
    });
    return { investigationId: investigation.id, result };
  } catch (error) {
    await prisma.investigation.update({ where: { id: investigation.id }, data: { status: InvestigationStatus.FAILED, failureReason: error instanceof Error ? error.message : "Username intelligence collection failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function getUsernameResult(id: string, tenantId: string) {
  const result = await prisma.usernameIntelligenceResult.findFirst({ where: { id, tenantId }, include: { investigation: { select: { id: true, name: true, status: true } }, evidence: { select: { id: true, sourceUrl: true, title: true, contentHash: true, collectedAt: true } } } });
  if (!result) throw new AppError(404, "Username intelligence result not found", "USERNAME_RESULT_NOT_FOUND");
  return result;
}

export async function listUsernameHistory(tenantId: string, value?: string) {
  const username = value ? normalizeUsername(value) : undefined;
  return prisma.usernameIntelligenceResult.findMany({ where: { tenantId, ...(username ? { username } : {}) }, select: { id: true, username: true, status: true, collectedAt: true, investigation: { select: { id: true, name: true, status: true } } }, orderBy: { collectedAt: "desc" }, take: 50 });
}

async function lookupGithub(username: string) {
  const collectedAt = new Date().toISOString();
  const profileUrl = `https://github.com/${encodeURIComponent(username)}`;
  const apiUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const headers: Record<string, string> = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "OSINT-X/1.0" };
  if (process.env.GITHUB_API_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_API_TOKEN}`;
  try {
    const response = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return searchGithubUsers(username, headers, collectedAt);
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
    const user = await response.json() as Record<string, unknown>;
    const login = String(user.login ?? username);
    return {
      profiles: [{ platform: "GitHub", username: login, profileUrl: String(user.html_url ?? profileUrl), confidence: { score: 100, level: "high", method: "GitHub public user endpoint returned this exact handle; handle match only." }, metadata: { displayName: user.name ?? null, bio: user.bio ?? null, company: user.company ?? null, location: user.location ?? null, website: user.blog ?? null, publicRepositories: user.public_repos ?? null, followers: user.followers ?? null, following: user.following ?? null, createdAt: user.created_at ?? null } }],
      source: { name: "GitHub public profile API", url: profileUrl, status: "available" as const, collectedAt },
    };
  } catch (error) {
    return { profiles: [] as Array<Record<string, unknown>>, source: { name: "GitHub public profile API", url: profileUrl, status: "unavailable" as const, collectedAt, detail: error instanceof Error ? error.message : "GitHub lookup unavailable" } };
  }
}

async function searchGithubUsers(username: string, headers: Record<string, string>, collectedAt: string) {
  const searchUrl = `https://github.com/search?q=${encodeURIComponent(username)}&type=users`;
  const apiUrl = `https://api.github.com/search/users?q=${encodeURIComponent(username)}&per_page=10`;
  try {
    const response = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`GitHub user search returned HTTP ${response.status}`);
    const payload = await response.json() as { items?: Array<Record<string, unknown>> };
    const profiles = (payload.items ?? []).map((user) => {
      const login = String(user.login ?? "");
      const exact = login.toLowerCase() === username.toLowerCase();
      const prefix = login.toLowerCase().startsWith(username.toLowerCase()) || username.toLowerCase().startsWith(login.toLowerCase());
      const score = exact ? 100 : prefix ? 60 : 35;
      return { platform: "GitHub", username: login, profileUrl: String(user.html_url ?? `https://github.com/${encodeURIComponent(login)}`), confidence: { score, level: score >= 80 ? "high" : score >= 50 ? "moderate" : "low", method: exact ? "Exact normalized handle returned by GitHub user search; handle match only." : "Search-result handle similarity only; this is not an identity match." }, metadata: { accountType: user.type ?? null, avatarUrl: user.avatar_url ?? null } };
    });
    return { profiles, source: { name: "GitHub public user search", url: searchUrl, status: "available" as const, collectedAt, detail: profiles.length ? undefined : "No matching public profile returned." } };
  } catch (error) {
    return { profiles: [] as Array<Record<string, unknown>>, source: { name: "GitHub public user search", url: searchUrl, status: "unavailable" as const, collectedAt, detail: error instanceof Error ? error.message : "GitHub search unavailable" } };
  }
}

async function lookupReddit(username: string) {
  const collectedAt = new Date().toISOString();
  const profileUrl = `https://www.reddit.com/user/${encodeURIComponent(username)}/`;
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT;
  if (!clientId || !clientSecret || !userAgent) return { profiles: [] as Array<Record<string, unknown>>, source: { name: "Reddit public profile API", url: profileUrl, status: "unavailable" as const, collectedAt, detail: "Reddit OAuth app credentials and a registered user agent are not configured." } };
  try {
    const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded", "user-agent": userAgent }, body: new URLSearchParams({ grant_type: "client_credentials" }), signal: AbortSignal.timeout(8000) });
    if (!tokenResponse.ok) throw new Error(`Reddit OAuth returned HTTP ${tokenResponse.status}`);
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new Error("Reddit OAuth did not return an access token");
    const response = await fetch(`https://oauth.reddit.com/user/${encodeURIComponent(username)}/about`, { headers: { authorization: `Bearer ${tokenData.access_token}`, "user-agent": userAgent, accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return { profiles: [] as Array<Record<string, unknown>>, source: { name: "Reddit public profile API", url: profileUrl, status: "available" as const, collectedAt, detail: "Reddit returned no public profile for this handle." } };
    if (!response.ok) throw new Error(`Reddit profile API returned HTTP ${response.status}`);
    const payload = await response.json() as { data?: Record<string, unknown> };
    const user = payload.data ?? {};
    const accountName = String(user.name ?? username);
    const sameHandle = accountName.toLowerCase() === username.toLowerCase();
    const subreddit = typeof user.subreddit === "object" && user.subreddit !== null ? user.subreddit as Record<string, unknown> : {};
    return {
      profiles: [{ platform: "Reddit", username: accountName, profileUrl, confidence: { score: sameHandle ? 100 : 85, level: "high", method: "Reddit public about endpoint returned this handle; handle match only." }, metadata: { createdAt: typeof user.created_utc === "number" ? new Date(user.created_utc * 1000).toISOString() : null, linkKarma: user.link_karma ?? null, commentKarma: user.comment_karma ?? null, profileTitle: subreddit.title ?? null, publicDescription: subreddit.public_description ?? null } }],
      source: { name: "Reddit public profile API", url: profileUrl, status: "available" as const, collectedAt },
    };
  } catch (error) {
    return { profiles: [] as Array<Record<string, unknown>>, source: { name: "Reddit public profile API", url: profileUrl, status: "unavailable" as const, collectedAt, detail: error instanceof Error ? error.message : "Reddit lookup unavailable" } };
  }
}

function notRequested(name: string) {
  return { profiles: [] as Array<Record<string, unknown>>, source: { name, url: "", status: "not_requested" as const, collectedAt: new Date().toISOString(), detail: "Platform lookup was not selected." } };
}
