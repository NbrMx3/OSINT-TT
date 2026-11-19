import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={cn("inline-flex items-center rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-400", className)} {...props} />; }
