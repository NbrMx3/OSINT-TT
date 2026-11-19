import { CheckCircle2, CircleAlert, LoaderCircle, XCircle } from "lucide-react";
import type { IntelligenceSource } from "../../types/dashboard";
import { EmptyState } from "../EmptyState";

const statusMeta = { operational: { label: "Operational", icon: CheckCircle2, className: "text-cyan-300" }, syncing: { label: "Syncing", icon: LoaderCircle, className: "text-blue-300" }, degraded: { label: "Degraded", icon: CircleAlert, className: "text-orange-300" }, offline: { label: "Offline", icon: XCircle, className: "text-rose-300" } };

export function SourceStatusList({ sources }: { sources: IntelligenceSource[] }) {
  if (!sources.length) return <EmptyState compact title="No sources connected" description="Connect an intelligence source to see collection health here." actionLabel="Connect source" />;
  return <div className="space-y-2">{sources.map((source) => { const meta = statusMeta[source.status]; const Icon = meta.icon; return <div className="flex items-center gap-3 rounded-md border border-white/[0.05] bg-white/[0.015] p-2.5" key={source.id}><Icon className={meta.className} size={15} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-medium text-slate-300">{source.name}</p><p className="mt-0.5 text-[9px] text-slate-600">{source.type}{source.lastSync ? ` · ${source.lastSync}` : ""}</p></div><span className={`text-[9px] ${meta.className}`}>{meta.label}</span></div>; })}</div>;
}
