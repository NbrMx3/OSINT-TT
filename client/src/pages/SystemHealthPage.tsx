import { Activity, AlertTriangle, Database, Gauge, Layers3, RefreshCw, ServerCog } from "lucide-react";
import { useSystemHealth } from "../hooks/useHealth";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { formatDate } from "../utils/format";

export default function SystemHealthPage() {
  const health = useSystemHealth();
  if (health.isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-96 w-full" /></div>;
  const data = health.data;

  return <div className="mx-auto max-w-[1500px] space-y-7">
    <section className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 md:flex-row md:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Operations</p><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">System health center</h2><p className="mt-2 text-xs text-slate-500">Provider availability, job queues, API performance, database health, limits, and error trends.</p></div><Button size="sm" variant="outline" disabled={health.isFetching} onClick={() => void health.refetch()}><RefreshCw size={13} className={health.isFetching ? "animate-spin" : ""} /> Refresh</Button></section>

    {data && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Database} label="Database" value={data.database.status} detail={`${data.database.latencyMs} ms service latency`} tone={data.database.status === "connected" ? "cyan" : "rose"} />
        <Metric icon={Layers3} label="Queue depth" value={String(data.queue.depth)} detail={`${data.queue.queued} queued · ${data.queue.running} running`} tone={data.queue.failed ? "orange" : "cyan"} />
        <Metric icon={AlertTriangle} label="Failed jobs" value={String(data.queue.failed)} detail="Recent failed investigations" tone={data.queue.failed ? "rose" : "cyan"} />
        <Metric icon={Gauge} label="API p95 latency" value={`${data.api.p95LatencyMs} ms`} detail={`${data.api.requestCount} requests in 24 hours`} tone={data.api.p95LatencyMs > 1000 ? "orange" : "cyan"} />
        <Metric icon={Activity} label="Error rate" value={String(data.api.errorCount)} detail={`${data.api.rateLimitUsagePercent}% rate limit usage`} tone={data.api.errorCount ? "rose" : "cyan"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><ServerCog size={16} className="text-cyan-300" /> Provider availability</CardTitle><CardDescription className="mt-2">Connected intelligence source status.</CardDescription></CardHeader><CardContent className="space-y-2">{data.providers.length ? data.providers.map((provider) => <div className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={provider.id}><span className={`h-2 w-2 rounded-full ${provider.status === "operational" ? "bg-emerald-400" : provider.status === "syncing" ? "bg-cyan-400" : provider.status === "degraded" ? "bg-orange-400" : "bg-rose-400"}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-300">{provider.name}</p><p className="mt-1 text-[9px] text-slate-600">{provider.type}{provider.lastSyncAt ? ` · synced ${formatDate(provider.lastSyncAt)}` : " · never synced"}</p></div><Badge>{provider.status}</Badge></div>) : <p className="py-8 text-center text-xs text-slate-600">No providers configured.</p>}</CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gauge size={16} className="text-cyan-300" /> API and rate limits</CardTitle><CardDescription className="mt-2">Request performance over the latest recorded window.</CardDescription></CardHeader><CardContent className="space-y-4"><div><div className="flex justify-between text-[10px] text-slate-500"><span>Rate limit usage</span><span>{data.api.rateLimitUsagePercent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(data.api.rateLimitUsagePercent, 100)}%` }} /></div><p className="mt-2 text-[9px] text-slate-600">{data.api.rateLimitUsed} used · {data.api.rateLimitRemaining} remaining · {data.api.rateLimitLimit} limit</p></div><div className="grid grid-cols-2 gap-3 text-[10px] text-slate-500"><div className="rounded-md border border-white/[0.06] p-3"><span className="block text-slate-600">P50 latency</span><span className="mt-1 block text-sm text-slate-200">{data.api.p50LatencyMs} ms</span></div><div className="rounded-md border border-white/[0.06] p-3"><span className="block text-slate-600">P95 latency</span><span className="mt-1 block text-sm text-slate-200">{data.api.p95LatencyMs} ms</span></div></div></CardContent></Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card><CardHeader><CardTitle>Failed jobs</CardTitle><CardDescription className="mt-2">Most recent investigation execution failures.</CardDescription></CardHeader><CardContent className="space-y-2">{data.failedJobs.length ? data.failedJobs.map((job) => <div className="rounded-md border border-rose-400/15 bg-rose-400/[0.04] p-3" key={job.id}><p className="text-xs font-medium text-rose-200">Investigation {job.investigationId}</p><p className="mt-1 break-words text-[10px] text-slate-500">{job.errorMessage ?? "Unknown failure"}</p><p className="mt-2 text-[9px] text-slate-600">{job.completedAt ? formatDate(job.completedAt) : "Not completed"}</p></div>) : <p className="py-8 text-center text-xs text-slate-600">No failed jobs in the current dataset.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Error trends</CardTitle><CardDescription className="mt-2">HTTP failures recorded per hour over the last 24 hours.</CardDescription></CardHeader><CardContent><div className="space-y-2">{data.errorTrends.map((item) => <div className="flex items-center gap-3" key={item.hour}><span className="w-28 shrink-0 text-[9px] text-slate-600">{item.hour}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min(item.count * 20, 100)}%` }} /></div><span className="w-6 text-right text-[10px] text-slate-400">{item.count}</span></div>)}</div></CardContent></Card>
      </section>

      <Card><CardHeader><CardTitle>Recent operational activity</CardTitle><CardDescription className="mt-2">Latest actions and API outcomes.</CardDescription></CardHeader><CardContent className="space-y-2">{data.recentActivity.map((item) => <div className="flex items-center gap-3 border-b border-white/[0.05] py-2 last:border-0" key={item.id}><span className={`h-1.5 w-1.5 rounded-full ${item.outcome === "failure" ? "bg-rose-400" : "bg-cyan-400"}`} /><p className="flex-1 text-[10px] text-slate-300">{item.action.replaceAll("_", " ")}</p><Badge>{String(item.outcome)}</Badge><time className="text-[9px] text-slate-600">{formatDate(item.timestamp)}</time></div>)}</CardContent></Card>
    </>}
  </div>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Database; label: string; value: string; detail: string; tone: "cyan" | "orange" | "rose" }) {
  const toneClass = tone === "rose" ? "text-rose-300" : tone === "orange" ? "text-orange-300" : "text-cyan-300";
  return <Card><CardContent className="pt-5"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p></div><Icon size={16} className={toneClass} /></div><p className="mt-2 text-[9px] text-slate-600">{detail}</p></CardContent></Card>;
}
