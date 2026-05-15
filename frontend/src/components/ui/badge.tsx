import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-2",
        {
          "border-transparent bg-gradient-to-br from-[#172E7F] to-[#2A5FA6] text-white shadow-[0_2px_8px_rgba(23,46,127,0.25)]":
            variant === "default",
          "border-transparent bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.08)]":
            variant === "secondary",
          "border-transparent bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.25)]":
            variant === "destructive",
          "border-transparent bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-700 border-emerald-200 shadow-[0_2px_6px_rgba(16,185,129,0.15)]":
            variant === "success",
          "border-2 border-slate-200 bg-white/90 text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:border-slate-300":
            variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
