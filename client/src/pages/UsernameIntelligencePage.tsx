import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, AtSign, Github, History, LoaderCircle, Search, UserRound, Users } from "lucide-react";
import { useInvestigateUsername, useUsernameHistory, useUsernameResult } from "../hooks/useUsernameIntelligence";
import type { UsernameProfile, UsernameResult } from "../types/username";
import type { IntelligenceSource } from "../types/email";
import { getApiErrorMessage } from "../utils/errors";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { formatDate } from "../utils/format";

function UsernameIntelligencePage() {
  const [username, setUsername] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["github", "reddit"]);
  const [latestResult, setLatestResult] = useState<UsernameResult | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const [error, setError] = useState("");
  const mutation = useInvestigateUsername();
  const history = useUsernameHistory();
  const selected = useUsernameResult(selectedResultId);
  const result = selected.data?.result ?? latestResult;
  const data = result?.data;

  function togglePlatform(platform: string) { setPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSelectedResultId(undefined);
    if (!platforms.length) { setError("Select at least one public platform to search."); return; }
    try { const response = await mutation.mutateAsync({ username, platforms }); setLatestResult(response.result); setUsername(response.result.username); }
    catch (reason) { setError(getApiErrorMessage(reason, "Username intelligence collection failed.")); }
  }

  return <div className="mx-auto max-w-[1500px] space-y-7">
    <section className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Intelligence / Username</p><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Username intelligence</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Discover public profiles through platform APIs. A matching handle does not establish that separate profiles belong to the same person.</p></div><form className="flex w-full max-w-xl gap-2" onSubmit={submit}><div className="relative flex-1"><AtSign className="absolute left-3 top-2.5 text-slate-600" size={15} /><Input aria-label="Username" autoComplete="off" className="h-10 pl-9" maxLength={40} placeholder="public_handle" required value={username} onChange={(event) => setUsername(event.target.value)} /></div><Button className="h-10" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="animate-spin" size={15} /> : <Search size={15} />}{mutation.isPending ? "Searching..." : "Search"}</Button></form></section>
    <div className="grid gap-3 sm:grid-cols-2"><PlatformChoice checked={platforms.includes("github")} icon={<Github size={15} />} label="GitHub public profiles" description="Direct public profile lookup, then public user search if no exact handle exists." onChange={() => togglePlatform("github")} /><PlatformChoice checked={platforms.includes("reddit")} icon={<Users size={15} />} label="Reddit public profiles" description="Official OAuth API lookup. Requires an authorized Reddit app and server credentials." onChange={() => togglePlatform("reddit")} /></div>
    {error && <div className="flex items-start gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-xs text-rose-200"><AlertTriangle className="mt-0.5 shrink-0" size={15} />{error}</div>}
    {(mutation.isPending || (selectedResultId && selected.isLoading)) && <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>}
    {selected.isError && <div className="flex items-start gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-xs text-rose-200"><AlertTriangle className="mt-0.5 shrink-0" size={15} />{getApiErrorMessage(selected.error, "Could not load the saved username result.")}</div>}
    {data && !mutation.isPending && <UsernameReport result={result as UsernameResult} />}
    {!data && !mutation.isPending && !selected.isLoading && !selected.isError && <Card><CardContent><EmptyState icon={UserRound} title="Ready to search a handle" description="Choose public platforms above. Collections use official API access and report unavailable integrations without inventing profiles." /></CardContent></Card>}
    <Card>
      <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><History className="text-cyan-300" size={16} />Investigation history</CardTitle><CardDescription className="mt-2">Saved username collections in your tenant.</CardDescription></div><Badge>{history.data?.history.length ?? 0} records</Badge></div></CardHeader>
      <CardContent>{history.isLoading ? <Skeleton className="h-20 w-full" /> : history.data?.history.length ? (
        <div className="space-y-2">{history.data.history.map((item) => (
          <button className="flex w-full items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]" key={item.id} onClick={() => { setSelectedResultId(item.id); setLatestResult(null); setUsername(item.username); }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/[0.06] text-cyan-300"><AtSign size={15} /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-300">{item.username}</span><span className="mt-1 block text-[9px] text-slate-600">{item.investigation.name} · {formatDate(item.collectedAt)}</span></span>
            <Badge>{item.status}</Badge><ArrowUpRight className="text-slate-600" size={14} />
          </button>
        ))}</div>
      ) : <EmptyState compact icon={History} title="No username history" description="Saved platform searches will appear here." />}</CardContent>
    </Card>
  </div>;
}

function PlatformChoice({ checked, icon, label, description, onChange }: { checked: boolean; icon: ReactNode; label: string; description: string; onChange: () => void }) { return <label className="flex cursor-pointer gap-3 rounded-md border border-white/[0.07] bg-white/[0.02] p-3"><input className="mt-0.5 accent-cyan-400" checked={checked} onChange={onChange} type="checkbox" /><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300">{icon}</span><span><span className="block text-xs font-medium text-slate-300">{label}</span><span className="mt-1 block text-[10px] leading-5 text-slate-600">{description}</span></span></label>; }

function UsernameReport({ result }: { result: UsernameResult }) {
  const data = result.data;
  return <div className="space-y-4"><Card><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300"><AtSign size={21} /></span><div><h3 className="text-lg font-semibold text-white">{data.username}</h3><p className="mt-1 text-[10px] text-slate-600">Collected {formatDate(result.collectedAt)} · {data.profiles.length} public profile{data.profiles.length === 1 ? "" : "s"} returned</p></div></div><Badge>{result.status}</Badge></div><p className="mt-4 rounded-md border border-cyan-400/10 bg-cyan-400/[0.025] p-3 text-[10px] leading-5 text-slate-500">{data.confidenceMethod}</p></CardContent></Card>
    {data.profiles.length ? <div className="grid gap-4 xl:grid-cols-2">{data.profiles.map((profile, index) => <ProfileCard key={`${profile.platform}-${profile.username}-${index}`} profile={profile} />)}</div> : <Card><CardContent><EmptyState icon={UserRound} title="No public profiles returned" description="Selected APIs returned no matching public profile. This does not prove that the handle is unused." /></CardContent></Card>}
    <Section title="Source verification" description="API source status and timestamps for this lookup."><SourceList sources={result.sourceReferences ?? data.sources} /></Section>
  </div>;
}

function ProfileCard({ profile }: { profile: UsernameProfile }) {
  const confidenceColor = profile.confidence.level === "high" ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300" : profile.confidence.level === "moderate" ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-200" : "border-slate-400/15 bg-slate-400/[0.04] text-slate-400";
  const fields = Object.entries(profile.metadata).filter(([, value]) => value !== null && value !== undefined && value !== "");
  return <Card><CardHeader><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300">{profile.platform === "GitHub" ? <Github size={16} /> : <Users size={16} />}</span><div><CardTitle>{profile.platform}</CardTitle><CardDescription className="mt-1">@{profile.username}</CardDescription></div></div><Badge className={confidenceColor}>{profile.confidence.level} · {profile.confidence.score}%</Badge></div></CardHeader><CardContent><a className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline" href={profile.profileUrl} rel="noreferrer" target="_blank">Open public profile <ArrowUpRight size={13} /></a><p className="mt-3 text-[10px] leading-5 text-slate-500">{profile.confidence.method}</p>{fields.length > 0 && <div className="mt-4 grid gap-x-5 gap-y-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2">{fields.map(([key, value]) => <div key={key}><p className="text-[9px] uppercase tracking-wider text-slate-600">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 break-words text-[10px] text-slate-300">{formatValue(value)}</p></div>)}</div>}</CardContent></Card>;
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription className="mt-2">{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; }
function SourceList({ sources }: { sources: IntelligenceSource[] }) { return <div className="space-y-2">{sources.map((source, index) => <div className="flex items-start gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={`${source.name}-${index}`}><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${source.status === "available" ? "bg-emerald-400" : "bg-slate-600"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs text-slate-300">{source.name}</p><Badge>{source.status.replace("_", " ")}</Badge></div>{source.url && <a className="mt-1 block break-all text-[9px] text-cyan-300 hover:underline" href={source.url} rel="noreferrer" target="_blank">{source.url} <ArrowUpRight className="inline" size={10} /></a>}{source.detail && <p className="mt-1 text-[9px] leading-4 text-slate-600">{source.detail}</p>}<p className="mt-1 text-[9px] text-slate-700">Collected {formatDate(source.collectedAt)}</p></div></div>)}</div>; }
function formatValue(value: unknown): string { if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) return "Unavailable"; if (typeof value === "object") return JSON.stringify(value); return String(value); }

export default UsernameIntelligencePage;
