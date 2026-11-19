import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, Globe2, History, LoaderCircle, MapPin, Network, Search, Server, ShieldAlert, Wifi } from "lucide-react";
import { useIpHistory, useIpResult, useInvestigateIp } from "../hooks/useIpIntelligence";
import type { IpAvailability, IpCollectionData, IpResult } from "../types/ip";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { getApiErrorMessage } from "../utils/errors";
import { formatDate } from "../utils/format";

function IpIntelligencePage() {
  const [ip, setIp] = useState("");
  const [latestResult, setLatestResult] = useState<IpResult | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const [error, setError] = useState("");
  const mutation = useInvestigateIp();
  const history = useIpHistory();
  const selected = useIpResult(selectedResultId);
  const result = selectedResultId ? selected.data?.result : latestResult;
  const data = result?.data;
  const loading = selectedResultId ? selected.isLoading : mutation.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSelectedResultId(undefined);
    try {
      const response = await mutation.mutateAsync({ ip });
      setLatestResult(response.result);
      setIp(response.result.ip);
    } catch (reason) { setError(getApiErrorMessage(reason, "IP intelligence collection failed.")); }
  }

  return <div className="mx-auto max-w-[1500px] space-y-7">
    <section className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Intelligence / IP</p><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">IP intelligence</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Review address classification, public registration, geolocation, reverse DNS, and passive threat intelligence sources.</p><p className="mt-2 max-w-2xl text-[10px] leading-5 text-slate-600">VirusTotal may add queried indicators to its community dataset. See its <a className="text-cyan-300 hover:underline" href="https://docs.virustotal.com/reference/ip-info" rel="noreferrer" target="_blank">IP lookup data notice</a>.</p></div>
      <form className="flex w-full max-w-xl gap-2" onSubmit={submit}><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-600" size={15} /><Input aria-label="IPv4 or IPv6 address" autoComplete="off" className="h-10 pl-9 font-mono" placeholder="Enter IPv4 or IPv6 address" required value={ip} onChange={(event) => setIp(event.target.value)} /></div><Button disabled={mutation.isPending} className="h-10">{mutation.isPending ? <LoaderCircle className="animate-spin" size={15} /> : <Wifi size={15} />} {mutation.isPending ? "Collecting..." : "Investigate"}</Button></form>
    </section>
    {error && <div className="flex items-start gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-xs text-rose-200"><AlertTriangle className="mt-0.5" size={15} />{error}</div>}
    {loading && <CollectionSkeleton />}
    {data && !loading && result && <IpReport result={result} data={data} />}
    {!data && !loading && <Card><CardContent><EmptyState icon={Wifi} title="Ready for an IP address" description="Enter an IPv4 or IPv6 address. Non-public ranges are classified locally and are not sent to external intelligence providers." /></CardContent></Card>}
    <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><History className="text-cyan-300" size={16} /> Investigation history</CardTitle><CardDescription className="mt-2">Saved IP collections in your tenant.</CardDescription></div><Badge>{history.data?.history.length ?? 0} records</Badge></div></CardHeader><CardContent>{history.isLoading ? <Skeleton className="h-20 w-full" /> : history.data?.history.length ? <div className="space-y-2">{history.data.history.map((item) => <button className="flex w-full items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]" key={item.id} onClick={() => { setSelectedResultId(item.id); setIp(item.ip); }}><span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/[0.06] text-cyan-300"><Wifi size={15} /></span><span className="min-w-0 flex-1"><span className="block font-mono text-xs text-slate-300">{item.ip}</span><span className="mt-1 block text-[9px] text-slate-600">{item.investigation.name} · {formatDate(item.collectedAt)}</span></span><Badge>{item.status}</Badge><ArrowUpRight className="text-slate-600" size={14} /></button>)}</div> : <EmptyState compact icon={History} title="No IP history" description="Saved IP investigations will appear here." />}</CardContent></Card>
  </div>;
}

function IpReport({ result, data }: { result: IpResult; data: IpCollectionData }) {
  const abuse = data.intelligence.abuseIpDb.data;
  const vt = data.intelligence.virusTotal.data;
  const shodan = data.intelligence.shodan.data;
  const reports = arrayOfRecords(abuse?.reports);
  const stats = asRecord(vt?.lastAnalysisStats);
  return <div className="space-y-4">
    <Card><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300"><Wifi size={22} /></span><div><h3 className="font-mono text-xl font-semibold text-white">{data.ip}</h3><p className="mt-1 font-mono text-[9px] text-slate-600">Result {result.id} · {formatDate(result.collectedAt)}</p></div></div><div className="flex flex-wrap gap-2"><Badge className={data.classification.isPublic ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-200"}>{data.classification.scope.toUpperCase()}</Badge><Badge>IPv{data.classification.version}</Badge><Badge>{data.classification.isRoutable ? "Publicly routable" : "Not publicly routable"}</Badge></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Abuse confidence" value={abuse?.abuseConfidenceScore} suffix="%" icon={<ShieldAlert size={14} />} /><Metric label="Abuse reports" value={abuse?.totalReports} icon={<AlertTriangle size={14} />} /><Metric label="VT malicious detections" value={stats.malicious} icon={<ShieldAlert size={14} />} /><Metric label="Associated domains" value={data.associatedDomains.length} icon={<Globe2 size={14} />} /></div><p className="mt-4 text-[10px] text-slate-500">{data.classification.description} · Geolocation estimates the network address location and does not identify or locate a person.</p></CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Geolocation" description="Public IP geolocation estimate from ipwho.is" icon={<MapPin size={15} />}><InfoGrid block={data.geolocation} fields={{ Country: "country", Region: "region", City: "city", Continent: "continent", Coordinates: "coordinates", Timezone: "timezone" }} /></Section>
      <Section title="ASN and network" description="Network registration and provider context" icon={<Network size={15} />}><InfoGrid block={data.geolocation} fields={{ ASN: "asn", Organisation: "organisation", ISP: "isp", "Network domain": "networkDomain" }} secondary={data.registration} secondaryFields={{ "Registered name": "name", "Address range": "range", "RIR country": "country", Registry: "port43" }} /></Section>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Abuse reports" description="AbuseIPDB reports from the last 90 days, when configured" icon={<ShieldAlert size={15} />}><ProviderStatus block={data.intelligence.abuseIpDb} />{data.intelligence.abuseIpDb.available && <><div className="mb-3 grid gap-3 sm:grid-cols-2"><Metric label="Confidence score" value={abuse?.abuseConfidenceScore} suffix="%" icon={<ShieldAlert size={14} />} /><Metric label="Distinct reporters" value={abuse?.distinctReporters} icon={<History size={14} />} /></div><div className="mb-3 grid gap-2 text-[10px] text-slate-400 sm:grid-cols-2"><p>Usage: {display(abuse?.usageType)}</p><p>Last reported: {display(abuse?.lastReportedAt)}</p></div>{reports.length ? <div className="max-h-72 space-y-2 overflow-y-auto">{reports.map((report, index) => <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={`${String(report.reportedAt)}-${index}`}><div className="flex justify-between gap-3 text-[10px]"><span className="text-slate-400">{display(report.reportedAt)}</span><span className="text-slate-500">{display(report.reporterCountryCode)}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-500">{display(report.comment)}</p><p className="mt-2 text-[9px] text-slate-600">Categories: {display(report.categories)}</p></div>)}</div> : <Unavailable message="No abuse reports were returned for the requested period." />}{abuse?.reportsTruncated === true && <p className="mt-2 text-[9px] text-slate-600">Showing the first 25 reports. Additional reports exist in the source.</p>}</>}</Section>
      <Section title="VirusTotal threat intelligence" description="Community reputation and analysis results" icon={<ShieldAlert size={15} />}><ProviderStatus block={data.intelligence.virusTotal} />{data.intelligence.virusTotal.available && <><div className="grid gap-3 sm:grid-cols-2"><Metric label="Community reputation" value={vt?.reputation} icon={<ShieldAlert size={14} />} /><Metric label="Malicious detections" value={stats.malicious} icon={<AlertTriangle size={14} />} /><Metric label="Suspicious detections" value={stats.suspicious} icon={<AlertTriangle size={14} />} /><Metric label="Harmless detections" value={stats.harmless} icon={<ShieldAlert size={14} />} /></div><p className="mt-3 text-[10px] text-slate-500">Network owner: {display(vt?.asOwner)} · RIR: {display(vt?.regionalInternetRegistry)}</p>{Array.isArray(vt?.tags) && vt.tags.length > 0 && <Pills title="Tags" values={vt.tags} />}</>}</Section>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Shodan passive observations" description="Previously collected host metadata. OSINT-X does not initiate scans." icon={<Server size={15} />}><ProviderStatus block={data.intelligence.shodan} />{data.intelligence.shodan.available && <><InfoGrid block={data.intelligence.shodan} fields={{ Organisation: "organization", ISP: "isp", ASN: "asn", Country: "countryName", City: "city", "Last observation": "lastUpdated" }} /><Pills title="Observed ports" values={Array.isArray(shodan?.ports) ? shodan.ports.map(String) : []} /><Pills title="Provider tags" values={Array.isArray(shodan?.tags) ? shodan.tags.map(String) : []} /></>}</Section>
      <Section title="Hosting provider" description="Provider signals from geolocation and passive host metadata" icon={<Server size={15} />}><InfoGrid block={data.hosting} fields={{ Provider: "provider", ISP: "isp", Organisation: "organisation", ASN: "asn", "Hosting network": "hostingNetwork", "Shodan tags": "shodanTags" }} /></Section>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Associated domains and reverse DNS" description="PTR records and domains linked by configured public datasets" icon={<Globe2 size={15} />}><div className="mb-4"><p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Reverse DNS (PTR)</p><Pills values={data.reverseDns.data?.hostnames ?? []} empty="No PTR names returned." /></div><div><p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-600">Associated domains</p><Pills values={data.associatedDomains} empty="No associated domains returned by available sources." /></div></Section>
      <Section title="RDAP registration" description="Public address block registration record" icon={<Network size={15} />}><InfoGrid block={data.registration} fields={{ Name: "name", Handle: "handle", Range: "range", "Start address": "startAddress", "End address": "endAddress", Country: "country", "IP version": "ipVersion", Organisation: "organisation", Status: "status" }} /></Section>
    </div>
    <Section title="Source references" description="Provider sources and availability for this investigation" icon={<History size={15} />}><div className="grid gap-2 md:grid-cols-2">{(result.sourceReferences ?? data.sources).map((source) => <div className="flex items-start justify-between gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={`${source.name}-${source.url}`}><div className="min-w-0"><p className="text-xs text-slate-300">{source.name}</p><p className="mt-1 break-all text-[9px] text-slate-600">{source.url}</p><p className="mt-1 text-[9px] text-slate-600">{formatDate(source.collectedAt)}</p></div><Badge className={source.status === "available" ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300" : ""}>{source.status}</Badge></div>)}</div></Section>
  </div>;
}

function Section({ title, description, icon, children }: { title: string; description: string; icon: ReactNode; children: ReactNode }) { return <Card><CardHeader><CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle><CardDescription className="mt-2">{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; }
function Metric({ label, value, suffix = "", icon }: { label: string; value: unknown; suffix?: string; icon: ReactNode }) { return <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-600">{icon}{label}</div><p className="mt-2 truncate text-xs font-medium text-slate-300">{display(value)}{value !== null && value !== undefined && value !== "" ? suffix : ""}</p></div>; }
function InfoGrid({ block, fields, secondary, secondaryFields }: { block: IpAvailability; fields: Record<string, string>; secondary?: IpAvailability; secondaryFields?: Record<string, string> }) {
  const values = [block, fields, ...(secondary && secondaryFields ? [secondary, secondaryFields] : [])] as Array<IpAvailability | Record<string, string>>;
  const pairs: Array<[string, string, IpAvailability]> = [];
  for (let index = 0; index < values.length; index += 2) {
    const source = values[index] as IpAvailability;
    const labels = values[index + 1] as Record<string, string>;
    for (const [label, key] of Object.entries(labels)) pairs.push([label, key, source]);
  }
  const unavailableSources = [block, ...(secondary ? [secondary] : [])].filter((source) => !source.available);
  const noValues = pairs.every(([, key, source]) => !source.available || source.data?.[key] === null || source.data?.[key] === undefined || source.data?.[key] === "");
  if (noValues && unavailableSources.length === [block, ...(secondary ? [secondary] : [])].length) return <div className="space-y-2">{unavailableSources.map((source, index) => <Unavailable key={index} message={source.error ?? "No data available from the source."} />)}</div>;
  return <div className="space-y-3">{unavailableSources.map((source, index) => <Unavailable key={index} message={source.error ?? "No data available from the source."} />)}<div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{pairs.filter(([, , source]) => source.available).map(([label, key, source]) => <div key={`${label}-${key}`}><p className="text-[9px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 break-words text-xs text-slate-300">{display(source.data?.[key])}</p></div>)}</div></div>;
}
function ProviderStatus({ block }: { block: IpAvailability }) { return block.available ? null : <Unavailable message={block.error ?? "No data returned by this source."} />; }
function Pills({ title, values, empty = "Unavailable" }: { title?: string; values: unknown[]; empty?: string }) { return <div>{title && <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-600">{title}</p>}{values.length ? <div className="flex flex-wrap gap-2">{values.map((value) => <Badge className="border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-200" key={String(value)}>{String(value)}</Badge>)}</div> : <Unavailable message={empty} />}</div>; }
function Unavailable({ message }: { message: string }) { return <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[10px] text-slate-600"><AlertTriangle size={13} />{message}</div>; }
function CollectionSkeleton() { return <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40 md:col-span-2" /><Skeleton className="h-52" /><Skeleton className="h-52" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>; }
function arrayOfRecords(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : []; }
function asRecord(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }
function display(value: unknown): string { if (value === null || value === undefined || value === "") return "Unavailable"; if (Array.isArray(value)) return value.length ? value.map(display).join(", ") : "Unavailable"; if (typeof value === "object") return JSON.stringify(value); return String(value); }

export default IpIntelligencePage;
