import { useLocation } from "react-router-dom";
import { ArrowUpRight, Database, FileText, Plus, Radar } from "lucide-react";
import { getNavigationItem } from "../config/navigation";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

function IntelligenceModulePage() {
  const location = useLocation();
  const item = getNavigationItem(location.pathname);
  const Icon = item?.icon ?? Radar;
  const isReports = location.pathname === "/reports";
  return <div className="mx-auto max-w-[1500px] space-y-7"><section className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-cyan-300"><Icon size={17} /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Intelligence module</span></div><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{item?.label ?? "Workspace module"}</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">{item?.description ?? "A focused workspace for intelligence operations."}</p></div><Button><Plus size={14} /> {isReports ? "Create report" : "New collection"}</Button></section><div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>{isReports ? "Report workspace" : "Module workspace"}</CardTitle><CardDescription className="mt-2">Ready for connected OSINT-X API responses.</CardDescription></div><Badge className="border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">API ready</Badge></div></CardHeader><CardContent><EmptyState icon={isReports ? FileText : Database} title={`No ${item?.label.toLowerCase() ?? "module"} data yet`} description="This interface is ready to consume backend results. Connect a source or create a collection to begin." actionLabel="View data sources" /></CardContent></Card><Card><CardHeader><CardTitle>Module readiness</CardTitle><CardDescription className="mt-2">Foundation status for this workspace view.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Capability</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Route and navigation</TableCell><TableCell><Badge className="border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">Ready</Badge></TableCell></TableRow><TableRow><TableCell>API response contract</TableCell><TableCell><Badge>Prepared</Badge></TableCell></TableRow><TableRow><TableCell>Collection adapter</TableCell><TableCell><Badge>Phase 3</Badge></TableCell></TableRow></TableBody></Table><Button className="mt-5 w-full" variant="outline">Explore documentation <ArrowUpRight size={13} /></Button></CardContent></Card></div></div>;
}

export default IntelligenceModulePage;
