import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
        secondary: "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]",
        outline: "border border-white/10 bg-transparent text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200",
        ghost: "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
        destructive: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
      },
      size: { default: "h-9 px-3.5", sm: "h-8 px-2.5 text-[11px]", lg: "h-10 px-4", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />; }
