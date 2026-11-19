import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { ActivityItem } from "../../types/dashboard";
import { EmptyState } from "../EmptyState";

const severityStyles = { info: { icon: Info, className: "bg-blue-400/[0.08] text-blue-300" }, success: { icon: CheckCircle2, className: "bg-cyan-400/[0.08] text-cyan-300" }, warning: { icon: AlertTriangle, className: "bg-orange-400/[0.08] text-orange-300" }, critical: { icon: ShieldAlert, className: "bg-rose-400/[0.08] text-rose-300" } };

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <EmptyState compact title="No recent activity" description="Investigation events will appear here as your workspace collects intelligence." />;
  return <div className="space-y-1">{items.map((item) => { const style = severityStyles[item.severity]; const Icon = style.icon; return <div className="flex items-center gap-3 rounded-md p-2 transition hover:bg-white/[0.03]" key={item.id}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${style.className}`}><Icon size={15} /></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-slate-300">{item.title}</p><p className="mt-1 truncate text-[10px] text-slate-600">{item.description}</p></div><span className="shrink-0 text-[9px] text-slate-600">{item.timestamp}</span></div>; })}</div>;
}
