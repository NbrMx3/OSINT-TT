import type { LucideIcon } from "lucide-react";
import { Database } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps { title: string; description: string; icon?: LucideIcon; actionLabel?: string; onAction?: () => void; compact?: boolean; }
export function EmptyState({ title, description, icon: Icon = Database, actionLabel, onAction, compact = false }: EmptyStateProps) { return <div className={`flex flex-col items-center justify-center text-center ${compact ? "min-h-28 py-5" : "min-h-52 py-10"}`}><span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300"><Icon size={18} /></span><p className="mt-3 text-xs font-semibold text-slate-300">{title}</p><p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-600">{description}</p>{actionLabel && onAction && <Button className="mt-4" size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>}</div>; }
