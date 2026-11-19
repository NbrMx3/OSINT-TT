import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface MetricCardProps { label: string; value: number | null | undefined; detail: string; icon: LucideIcon; accent?: "cyan" | "blue" | "violet" | "orange"; trend?: "up" | "down"; }
const accentClasses = { cyan: "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300", blue: "border-blue-400/15 bg-blue-400/[0.06] text-blue-300", violet: "border-violet-400/15 bg-violet-400/[0.06] text-violet-300", orange: "border-orange-400/15 bg-orange-400/[0.06] text-orange-300" };

export function MetricCard({ label, value, detail, icon: Icon, accent = "cyan", trend }: MetricCardProps) {
  return <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-medium text-slate-500">{label}</p><p className="mt-4 text-2xl font-semibold tracking-tight text-slate-100">{value ?? "—"}</p></div><span className={`flex h-8 w-8 items-center justify-center rounded-md border ${accentClasses[accent]}`}><Icon size={16} /></span></div><CardContent className="mt-3 flex items-center gap-1 p-0 text-[9px] text-slate-600">{trend === "up" && <ArrowUpRight size={12} className="text-cyan-400" />}{trend === "down" && <ArrowDownRight size={12} className="text-orange-400" />}{detail}</CardContent></Card>;
}
