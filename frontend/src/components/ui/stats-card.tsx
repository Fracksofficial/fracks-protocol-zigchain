import * as React from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  heading: string;
  value: string | number;
  className?: string;
}

export function StatsCard({ heading, value, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-6 w-full border border-slate-200/70 shadow-sm",
        className
      )}
    >
      <div className="space-y-2">
        <p className="text-[16px] font-normal">{heading}</p>
        <div className="flex items-baseline justify-between">
          <h3 className="text-2xl font-semibold">{value}</h3>
          <TrendingUp className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
