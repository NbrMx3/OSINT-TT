import { EmptyState } from "../EmptyState";
import type { InvestigationTrendPoint } from "../../types/dashboard";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function InvestigationTrendsChart({ data }: { data: InvestigationTrendPoint[] }) {
  if (!data.length) return <EmptyState compact title="Trend data unavailable" description="Investigation trends will render when the dashboard API returns time-series data." />;
  return <div className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} /><XAxis axisLine={false} tickLine={false} dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#0b121c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} /><Legend iconType="circle" wrapperStyle={{ color: "#94a3b8", fontSize: 10 }} /><Line type="monotone" dataKey="investigations" name="Investigations" stroke="#22d3ee" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="findings" name="Findings" stroke="#818cf8" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>;
}
