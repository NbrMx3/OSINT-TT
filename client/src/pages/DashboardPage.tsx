import { Activity, CheckCircle2, Database, Network, Radar, ShieldAlert, Target, Users, Zap } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
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

const emptyDashboard: DashboardResponse = { metrics: null, recentActivity: [], sources: [], investigationTrends: [], threatOverview: [] };

function DashboardPage() {
  const dashboardQuery = useDashboard();
  const healthQuery = useHealth();
  if (dashboardQuery.isLoading || healthQuery.isLoading) return <DashboardSkeleton />;
  const data = dashboardQuery.data ?? emptyDashboard;
  const metrics = data.metrics;
  const apiConnected = healthQuery.isSuccess;

  return <div className="mx-auto max-w-[1500px] space-y-7"><section className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 md:flex-row md:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Intelligence command center</p><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Dashboard overview</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Monitor investigations, sources, entities, and threat signals from one intelligence workspace.</p></div><div className="flex items-center gap-3 text-[10px] text-slate-500"><span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${apiConnected ? "bg-cyan-400" : "bg-orange-400"}`} /> {apiConnected ? "Live telemetry" : "API awaiting data"}</span><span className="text-slate-700">|</span><span>Phase 2 interface</span></div></section>
    {dashboardQuery.isError && <div className="rounded-md border border-orange-400/15 bg-orange-400/[0.06] px-4 py-3 text-xs text-orange-200">Dashboard data is not available yet. The interface remains ready for the backend dashboard response contract.</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><MetricCard label="Total investigations" value={metrics?.totalInvestigations} detail="Awaiting API metrics" icon={Target} accent="cyan" /><MetricCard label="Intelligence findings" value={metrics?.totalFindings} detail="Awaiting API metrics" icon={Zap} accent="blue" /><MetricCard label="Discovered entities" value={metrics?.discoveredEntities} detail="Awaiting API metrics" icon={Network} accent="violet" /><MetricCard label="Active investigations" value={metrics?.activeInvestigations} detail="Awaiting API metrics" icon={Radar} accent="orange" /><MetricCard label="Completed investigations" value={metrics?.completedInvestigations} detail="Awaiting API metrics" icon={CheckCircle2} accent="cyan" trend="up" /></section>
    <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Investigation trends</CardTitle><CardDescription className="mt-2">Investigation and finding volume over time</CardDescription></div><Badge className="border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">API driven</Badge></div></CardHeader><CardContent><InvestigationTrendsChart data={data.investigationTrends} /></CardContent></Card><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Threat intelligence overview</CardTitle><CardDescription className="mt-2">Severity distribution from connected sources</CardDescription></div><ShieldAlert size={16} className="text-orange-300" /></div></CardHeader><CardContent><ThreatOverviewChart data={data.threatOverview} /></CardContent></Card></section>
    <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]"><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Recent activity</CardTitle><CardDescription className="mt-2">Latest events across your workspace</CardDescription></div><Activity size={16} className="text-cyan-300" /></div></CardHeader><CardContent><ActivityFeed items={data.recentActivity} /></CardContent></Card><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Intelligence source status</CardTitle><CardDescription className="mt-2">Collection pipeline availability</CardDescription></div><Database size={16} className="text-cyan-300" /></div></CardHeader><CardContent><SourceStatusList sources={data.sources} /></CardContent></Card></section>
    <Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Workspace readiness</CardTitle><CardDescription className="mt-2">Phase 2 UI capabilities and backend contracts</CardDescription></div><Users size={16} className="text-cyan-300" /></div></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Readiness label="Responsive workspace" detail="Desktop, tablet, and mobile layouts" /><Readiness label="Reusable components" detail="Cards, tables, dialogs, inputs, and states" /><Readiness label="API data contract" detail="Typed dashboard response ready" /></div><Button className="mt-5" variant="outline">Configure data sources</Button></CardContent></Card>
  </div>;
}

function Readiness({ label, detail }: { label: string; detail: string }) { return <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-xs font-medium text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />{label}</div><p className="mt-2 text-[10px] leading-5 text-slate-600">{detail}</p></div>; }

export default DashboardPage;
