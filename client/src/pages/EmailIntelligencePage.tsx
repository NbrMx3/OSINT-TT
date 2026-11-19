import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, AtSign, CheckCircle2, Clock3, Database, ExternalLink, Globe2, History, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import { useEmailHistory, useEmailResult, useInvestigateEmail } from "../hooks/useEmailIntelligence";
import type { EmailCollectionData, EmailResult, IntelligenceSource } from "../types/email";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { getApiErrorMessage } from "../utils/errors";
import { formatDate } from "../utils/format";

function EmailIntelligencePage() {
  const [email, setEmail] = useState("");
  const [checkBreachExposure, setCheckBreachExposure] = useState(false);
  const [searchPublicReferences, setSearchPublicReferences] = useState(false);
  const [latestResult, setLatestResult] = useState<EmailResult | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const [error, setError] = useState("");
  const mutation = useInvestigateEmail();
  const history = useEmailHistory();
  const selected = useEmailResult(selectedResultId);
  const result = selected.data?.result ?? latestResult;
  const data = result?.data;

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSelectedResultId(undefined);
    try { const response = await mutation.mutateAsync({ email, checkBreachExposure, searchPublicReferences }); setLatestResult(response.result); setEmail(response.result.email); }
    catch (reason) { setError(getApiErrorMessage(reason, "Email intelligence collection failed.")); }
  }

  return <div className="mx-auto max-w-[1500px] space-y-7">
    <section className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Intelligence / Email</p><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Email intelligence</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Validate an address and review its public domain mail configuration, registration data, and optional authorized public-source checks.</p></div>
      <form className="flex w-full max-w-xl gap-2" onSubmit={submit}><div className="relative flex-1"><AtSign className="absolute left-3 top-2.5 text-slate-600" size={15} /><Input aria-label="Email address" autoComplete="email" className="h-10 pl-9" placeholder="analyst@example.org" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div><Button className="h-10" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="animate-spin" size={15} /> : <Search size={15} />}{mutation.isPending ? "Collecting..." : "Investigate"}</Button></form>
    </section>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="flex cursor-pointer gap-3 rounded-md border border-white/[0.07] bg-white/[0.02] p-3"><input className="mt-0.5 accent-cyan-400" checked={checkBreachExposure} onChange={(event) => setCheckBreachExposure(event.target.checked)} type="checkbox" /><span><span className="block text-xs font-medium text-slate-300">Authorized breach exposure check</span><span className="mt-1 block text-[10px] leading-5 text-slate-600">When selected, the address is sent to Have I Been Pwned. Requires a server API key and account access.</span></span></label>
      <label className="flex cursor-pointer gap-3 rounded-md border border-white/[0.07] bg-white/[0.02] p-3"><input className="mt-0.5 accent-cyan-400" checked={searchPublicReferences} onChange={(event) => setSearchPublicReferences(event.target.checked)} type="checkbox" /><span><span className="block text-xs font-medium text-slate-300">Prepare public code search link</span><span className="mt-1 block text-[10px] leading-5 text-slate-600">When selected, a Grep.app link is saved. The address is sent only if you open that link; OSINT-X does not fetch or scrape results.</span></span></label>
    </div>
    {error && <ErrorNotice message={error} />}
    {(mutation.isPending || (selectedResultId && selected.isLoading)) && <CollectionSkeleton />}
    {selected.isError && <ErrorNotice message={getApiErrorMessage(selected.error, "Could not load the saved email result.")} />}
    {data && !mutation.isPending && <EmailReport result={result as EmailResult} data={data} />}
    {!data && !mutation.isPending && !selected.isLoading && !selected.isError && <Card><CardContent><EmptyState icon={AtSign} title="Ready for an email address" description="Mail configuration checks query public DNS for the domain. External breach and code-index checks run only when selected." /></CardContent></Card>}
    <Card>
      <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><History className="text-cyan-300" size={16} />Investigation history</CardTitle><CardDescription className="mt-2">Saved email intelligence collections in your tenant.</CardDescription></div><Badge>{history.data?.history.length ?? 0} records</Badge></div></CardHeader>
      <CardContent>
        {history.isLoading ? <Skeleton className="h-20 w-full" /> : history.data?.history.length ? (
          <div className="space-y-2">{history.data.history.map((item) => (
            <button className="flex w-full items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]" key={item.id} onClick={() => { setSelectedResultId(item.id); setLatestResult(null); setEmail(item.email); }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/[0.06] text-cyan-300"><AtSign size={15} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-300">{item.email}</span><span className="mt-1 block text-[9px] text-slate-600">{item.investigation.name} · {formatDate(item.collectedAt)}</span></span>
              <Badge>{item.status}</Badge><ArrowUpRight className="text-slate-600" size={14} />
            </button>
          ))}</div>
        ) : <EmptyState compact icon={History} title="No email history" description="Saved email collections will appear here." />}
      </CardContent>
    </Card>
  </div>;
}

function EmailReport({ result, data }: { result: EmailResult; data: EmailCollectionData }) {
  const dns = data.dns;
  return <div className="space-y-4">
    <Card><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300"><AtSign size={21} /></span><div><h3 className="break-all text-lg font-semibold text-white">{data.email}</h3><p className="mt-1 text-[10px] text-slate-600">Domain {data.domain} · Collected {formatDate(result.collectedAt)}</p></div></div><Badge className="w-fit border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"><CheckCircle2 className="mr-1" size={11} />Saved result</Badge></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="MX records" value={dns.mx.values.length} /><Metric label="SPF" value={dns.spf.available ? "Published" : "Unavailable"} /><Metric label="DMARC" value={dns.dmarc.available ? dns.dmarc.policy?.p ?? "Published" : "Unavailable"} /><Metric label="DKIM selectors" value={dns.dkim.values.length} /></div></CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-2">
    <Section title="Mail exchange" description="MX hosts and delivery preference, from public DNS." icon={<Globe2 size={15} />}><RecordTable headers={["Preference", "Mail host"]} rows={dns.mx.values.map((record) => [String(record.priority), record.exchange])} available={dns.mx.available} error={dns.mx.error} /></Section>
      <Section title="SPF analysis" description="Published SPF text and basic mechanism review; recursive SPF evaluation is not performed." icon={<ShieldCheck size={15} />}><TextRecords available={dns.spf.available} values={dns.spf.values} error={dns.spf.error} />{dns.spf.available && <div className="mt-3 space-y-2 rounded-md border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-[10px] text-slate-400">DNS lookup mechanisms counted: {dns.spf.analysis.dnsLookupMechanismCount}</p>{dns.spf.analysis.notes.map((note) => <p className="text-[10px] leading-5 text-amber-200/80" key={note}>{note}</p>)}</div>}</Section>
      <Section title="DMARC policy" description="Policy tags discovered at _dmarc for the email domain." icon={<ShieldCheck size={15} />}><TextRecords available={dns.dmarc.available} values={dns.dmarc.values} error={dns.dmarc.error} />{dns.dmarc.policy && <KeyValueGrid values={dns.dmarc.policy} />}</Section>
      <Section title="DKIM discovery" description="Common selectors checked against public DNS. Custom selectors may not be detected." icon={<Database size={15} />}><RecordTable headers={["Selector", "Published record"]} rows={dns.dkim.values.map((record) => [record.selector, record.record])} available={dns.dkim.available} error={dns.dkim.error} /><p className="mt-3 text-[9px] leading-4 text-slate-600">Selectors checked: {dns.dkim.selectorsChecked.join(", ")}</p></Section>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Domain registration" description="RDAP details for the email domain." icon={<Clock3 size={15} />}>{data.registration.available && data.registration.data ? <KeyValueGrid values={data.registration.data} /> : <Unavailable message={data.registration.error ?? "Registration information unavailable."} />}</Section>
      <Section title="Authorized breach exposure" description="Have I Been Pwned account API results, when explicitly requested and configured." icon={<ShieldCheck size={15} />}><BreachResults data={data.breachExposure} /></Section>
    </div>
    <Section title="Public indexed references" description="User-initiated search link for public code references; OSINT-X does not scrape the index." icon={<ExternalLink size={15} />}><ReferenceResults data={data.publicReferences} /></Section>
    <Section title="Source references" description="Source status and collection time for this result." icon={<History size={15} />}><SourceList sources={result.sourceReferences ?? data.sources} /></Section>
  </div>;
}

function Section({ title, description, icon, children }: { title: string; description: string; icon: ReactNode; children: ReactNode }) { return <Card><CardHeader><CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle><CardDescription className="mt-2">{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; }
function Metric({ label, value }: { label: string; value: ReactNode }) { return <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3"><p className="text-[9px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-2 truncate text-xs font-medium text-slate-300">{value}</p></div>; }
function RecordTable({ headers, rows, available, error }: { headers: string[]; rows: string[][]; available: boolean; error?: string }) { if (!available || !rows.length) return <Unavailable message={error ?? "No records available."} />; return <Table><TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={`${row[0]}-${index}`}>{row.map((value, cell) => <TableCell className="break-all font-mono text-[10px]" key={`${cell}-${value}`}>{value}</TableCell>)}</TableRow>)}</TableBody></Table>; }
function TextRecords({ available, values, error }: { available: boolean; values: string[]; error?: string }) { return available && values.length ? <div className="space-y-2">{values.map((value, index) => <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-white/[0.06] bg-black/20 p-3 font-mono text-[10px] leading-5 text-slate-300" key={`${value}-${index}`}>{value}</pre>)}</div> : <Unavailable message={error ?? "Record unavailable."} />; }
function KeyValueGrid({ values }: { values: Record<string, unknown> }) { const entries = Object.entries(values).filter(([, value]) => value !== null && value !== undefined && value !== ""); return entries.length ? <div className="grid gap-4 sm:grid-cols-2">{entries.map(([key, value]) => <div key={key}><p className="text-[9px] uppercase tracking-wider text-slate-600">{key}</p><p className="mt-1 break-words text-xs text-slate-300">{formatValue(value)}</p></div>)}</div> : <Unavailable message="No registration fields returned." />; }
function BreachResults({ data }: { data: EmailCollectionData["breachExposure"] }) { if (!data.checked) return <Unavailable message="Not requested for this collection." />; if (!data.available) return <Unavailable message={data.error ?? "Breach data unavailable."} />; if (!data.breaches.length) return <Unavailable message="HIBP returned no breach records for this address. This does not prove that no exposure exists." />; return <div className="space-y-2">{data.breaches.map((breach, index) => <div className="rounded-md border border-amber-400/15 bg-amber-400/[0.035] p-3" key={`${String(breach.name)}-${index}`}><p className="text-xs font-medium text-slate-200">{String(breach.title ?? breach.name ?? "Breach record")}</p><p className="mt-1 text-[10px] text-slate-500">{String(breach.domain ?? "Domain unavailable")} · {String(breach.breachDate ?? "Date unavailable")}</p><p className="mt-2 break-words text-[10px] leading-5 text-slate-400">Data classes: {formatValue(breach.dataClasses)}</p></div>)}<p className="text-[9px] text-slate-600">Source attribution: <a className="text-cyan-300 hover:underline" href="https://haveibeenpwned.com/" rel="noreferrer" target="_blank">Have I Been Pwned</a></p></div>; }
function ReferenceResults({ data }: { data: EmailCollectionData["publicReferences"] }) {
  if (!data.checked) return <Unavailable message="Not requested for this collection." />;
  if (data.available && data.references.length) return <div className="space-y-2">{data.references.map((reference, index) => (
    <a className="flex flex-wrap items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-xs hover:border-cyan-400/20" href={reference.url ?? reference.repositoryUrl ?? "https://github.com/"} key={`${reference.url}-${index}`} rel="noreferrer" target="_blank">
      <span className="min-w-0 flex-1 text-slate-300">{reference.repository ?? "GitHub result"}<span className="ml-2 text-slate-600">{reference.path}</span></span><ArrowUpRight className="text-cyan-300" size={14} />
    </a>
  ))}</div>;
  if (!data.searchUrl) return <Unavailable message={data.error ?? "No public search link is available."} />;
  return <div className="rounded-md border border-cyan-400/10 bg-cyan-400/[0.025] p-3"><p className="text-[10px] leading-5 text-slate-500">{data.error}</p><a className="mt-2 inline-flex items-center gap-2 text-xs text-cyan-300 hover:underline" href={data.searchUrl} rel="noreferrer" target="_blank">Open Grep.app public search<ArrowUpRight size={13} /></a></div>;
}
function SourceList({ sources }: { sources: IntelligenceSource[] }) { return <div className="space-y-2">{sources.map((source, index) => <div className="flex items-start gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={`${source.name}-${index}`}><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${source.status === "available" ? "bg-emerald-400" : "bg-slate-600"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs text-slate-300">{source.name}</p><Badge>{source.status.replace("_", " ")}</Badge></div>{source.url && <a className="mt-1 block break-all text-[9px] text-cyan-300 hover:underline" href={source.url} rel="noreferrer" target="_blank">{source.url} <ArrowUpRight className="inline" size={10} /></a>}{source.detail && <p className="mt-1 text-[9px] leading-4 text-slate-600">{source.detail}</p>}<p className="mt-1 text-[9px] text-slate-700">Collected {formatDate(source.collectedAt)}</p></div></div>)}</div>; }
function Unavailable({ message }: { message: string }) { return <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[10px] leading-5 text-slate-500"><AlertTriangle size={13} className="shrink-0" />{message}</div>; }
function ErrorNotice({ message }: { message: string }) { return <div className="flex items-start gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-xs text-rose-200"><AlertTriangle className="mt-0.5 shrink-0" size={15} />{message}</div>; }
function CollectionSkeleton() { return <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36 md:col-span-2" /><Skeleton className="h-52" /><Skeleton className="h-52" /><Skeleton className="h-48 md:col-span-2" /></div>; }
function formatValue(value: unknown): string { if (value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length)) return "Unavailable"; if (typeof value === "object") return JSON.stringify(value); return String(value); }

export default EmailIntelligencePage;
