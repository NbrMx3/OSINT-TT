import { useMemo, useState, type ReactNode } from "react";
import { Activity, Download, GripVertical, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useCreateSavedDashboard, useDashboard, useDeleteSavedDashboard, useSavedDashboards } from "../hooks/useDashboard";
import { useHealth } from "../hooks/useHealth";
import type { DashboardResponse } from "../types/dashboard";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { InvestigationTrendsChart } from "../components/dashboard/InvestigationTrendsChart";
import { MetricCard } from "../components/dashboard/MetricCard";
import { SourceStatusList } from "../components/dashboard/SourceStatusList";
import { ThreatOverviewChart } from "../components/dashboard/ThreatOverviewChart";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";

const emptyDashboard: DashboardResponse = { metrics: null, recentActivity: [], sources: [], investigationTrends: [], threatOverview: [] };
const defaultLayout = ["metrics", "trends", "threat", "activity", "sources"];

function DashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [layout, setLayout] = useState<string[]>(defaultLayout);
  const [dragged, setDragged] = useState("");
  const [viewName, setViewName] = useState("");
  const dashboardQuery = useDashboard({ from: from || undefined, to: to || undefined, tenantId: tenantId || undefined });
  const healthQuery = useHealth();
  const saved = useSavedDashboards();
  const createSaved = useCreateSavedDashboard();
  const deleteSaved = useDeleteSavedDashboard();
  const data = dashboardQuery.data ?? emptyDashboard;
  const metrics = data.metrics;

  const exportRows = useMemo(() => [
    ["metric", "value"],
    ["totalInvestigations", String(metrics?.totalInvestigations ?? 0)],
    ["totalFindings", String(metrics?.totalFindings ?? 0)],
    ["discoveredEntities", String(metrics?.discoveredEntities ?? 0)],
    ["activeInvestigations", String(metrics?.activeInvestigations ?? 0)],
    ["completedInvestigations", String(metrics?.completedInvestigations ?? 0)],
  ], [metrics]);

  if (dashboardQuery.isLoading || healthQuery.isLoading) return <DashboardSkeleton />;

  function moveWidget(targetId: string) {
    if (!dragged || dragged === targetId) return;
    setLayout((current) => { const next = [...current]; const sourceIndex = next.indexOf(dragged); const targetIndex = next.indexOf(targetId); if (sourceIndex < 0 || targetIndex < 0) return current; next.splice(sourceIndex, 1); next.splice(targetIndex, 0, dragged); return next; });
  }
  function download(format: "csv" | "json") {
    const body = format === "csv" ? exportRows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n") : JSON.stringify({ filters: { from, to, tenantId }, metrics, investigationTrends: data.investigationTrends, threatOverview: data.threatOverview, recentActivity: data.recentActivity, sources: data.sources }, null, 2);
    const blob = new Blob([body], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `dashboard-${new Date().toISOString().slice(0,10)}.${format}`; anchor.click(); URL.revokeObjectURL(url);
  }
  function applyView(view: { layout: string[]; filters: Record<string, unknown> | null }) {
    setLayout(view.layout.filter((item) => defaultLayout.includes(item)));
    setFrom(typeof view.filters?.from === "string" ? view.filters.from : ""); setTo(typeof view.filters?.to === "string" ? view.filters.to : ""); setTenantId(typeof view.filters?.tenantId === "string" ? view.filters.tenantId : "");
  }

  const widgets: Record<string, ReactNode> = {
    metrics: <Card><CardHeader><CardTitle>Key metrics</CardTitle><CardDescription className="mt-2">Workspace totals for the selected range</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><MetricCard label="Investigations" value={metrics?.totalInvestigations} detail="Selected range" icon={Activity} accent="cyan" /><MetricCard label="Findings" value={metrics?.totalFindings} detail="Selected range" icon={ShieldAlert} accent="orange" /><MetricCard label="Entities" value={metrics?.discoveredEntities} detail="Selected range" icon={Activity} accent="violet" /><MetricCard label="Active" value={metrics?.activeInvestigations} detail="In progress" icon={Activity} accent="blue" /><MetricCard label="Completed" value={metrics?.completedInvestigations} detail="Finished" icon={Activity} accent="cyan" /></div></CardContent></Card>,
    trends: <Card><CardHeader><CardTitle>Investigation trends</CardTitle><CardDescription className="mt-2">Volume over time</CardDescription></CardHeader><CardContent><InvestigationTrendsChart data={data.investigationTrends} /></CardContent></Card>,
    threat: <Card><CardHeader><CardTitle>Threat overview</CardTitle><CardDescription className="mt-2">Classification distribution</CardDescription></CardHeader><CardContent><ThreatOverviewChart data={data.threatOverview} /></CardContent></Card>,
    activity: <Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription className="mt-2">Latest workspace events</CardDescription></CardHeader><CardContent><ActivityFeed items={data.recentActivity} /></CardContent></Card>,
    sources: <Card><CardHeader><CardTitle>Source status</CardTitle><CardDescription className="mt-2">Collection pipeline health</CardDescription></CardHeader><CardContent><SourceStatusList sources={data.sources} /></CardContent></Card>,
  };

  return <div className="mx-auto max-w-[1500px] space-y-7">
    <section className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Intelligence command center</p><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Custom dashboard</h2><p className="mt-2 text-xs text-slate-500">Filter records, rearrange widgets, save views, and export charts and metrics.</p></div><div className="flex flex-wrap gap-2"><Badge>{healthQuery.isSuccess ? "Live telemetry" : "API unavailable"}</Badge><Button size="sm" variant="outline" onClick={() => download("csv")}><Download size={13} /> CSV</Button><Button size="sm" variant="outline" onClick={() => download("json")}><Download size={13} /> JSON</Button></div></section>
    <Card><CardHeader><CardTitle>Dashboard controls</CardTitle><CardDescription className="mt-2">Date range and tenant filters apply to dashboard records.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-[180px_180px_1fr_1fr_150px]"><label className="space-y-1 text-[9px] text-slate-500"><span>From</span><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="space-y-1 text-[9px] text-slate-500"><span>To</span><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label className="space-y-1 text-[9px] text-slate-500"><span>Tenant filter</span><Input placeholder="Tenant ID (administrators)" value={tenantId} onChange={(event) => setTenantId(event.target.value)} /></label><label className="space-y-1 text-[9px] text-slate-500"><span>Saved view name</span><Input placeholder="Executive view" value={viewName} onChange={(event) => setViewName(event.target.value)} /></label><Button className="mt-4" disabled={!viewName.trim()} onClick={() => createSaved.mutate({ name: viewName.trim(), layout, filters: { from, to, tenantId }, isPinned: true }, { onSuccess: () => setViewName("") })}><Save size={13} /> Save view</Button></div><div className="mt-4 flex flex-wrap gap-2">{saved.data?.dashboards.map((view) => <div className="flex items-center rounded-md border border-white/[0.08]" key={view.id}><button className="px-3 py-2 text-[10px] text-slate-300" type="button" onClick={() => applyView(view)}>{view.name}</button><button className="border-l border-white/[0.08] px-2 py-2 text-slate-600" type="button" aria-label={`Delete ${view.name}`} onClick={() => deleteSaved.mutate(view.id)}><Trash2 size={12} /></button></div>)}</div></CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-2">{layout.map((widgetId) => <div key={widgetId} draggable onDragStart={() => setDragged(widgetId)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveWidget(widgetId)} className="relative min-w-0"><span className="absolute right-3 top-3 z-10 cursor-grab text-slate-600"><GripVertical size={14} /></span>{widgets[widgetId]}</div>)}</div>
  </div>;
}
export default DashboardPage;
