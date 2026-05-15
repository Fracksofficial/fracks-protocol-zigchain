"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Building2,
  TrendingUp,
  Shield,
  Users,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RWAAsset } from "@/types/rwa";

interface AssetCardProps {
  asset: RWAAsset;
  className?: string;
}

export function AssetCard({ asset, className }: AssetCardProps) {
  const router = useRouter();
  const statusColors = {
    compliant:
      "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-700 border-emerald-300 shadow-[0_2px_8px_rgba(16,185,129,0.15)]",
    pending:
      "bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-700 border-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.15)]",
    "non-compliant":
      "bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-700 border-red-300 shadow-[0_2px_8px_rgba(220,38,38,0.15)]",
    "under-review":
      "bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-700 border-blue-300 shadow-[0_2px_8px_rgba(37,99,235,0.15)]",
  };

  const typeIcons = {
    "real-estate": Building2,
    commodity: TrendingUp,
    equity: Users,
    debt: Shield,
    art: Building2,
    "intellectual-property": Building2,
  } as const;

  const Icon = typeIcons[asset.assetType] || Building2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "overflow-hidden group bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-slate-200/80 shadow-[0_8px_32px_rgba(23,46,127,0.08)] hover:shadow-[0_16px_48px_rgba(23,46,127,0.14)] transition-all duration-300",
          className
        )}
      >
        {/* Header with Icon and Badge */}
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {asset.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {asset.location}
                </p>
              </div>
            </div>
            <Badge
              className={cn(
                "border-2 font-bold text-xs px-2.5 py-1",
                statusColors[asset.complianceStatus]
              )}
            >
              {asset.complianceStatus}
            </Badge>
          </div>
        </CardHeader>

        {/* Content - Stats Grid */}
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold mb-1">Value</p>
              <p className="font-bold text-slate-900 text-lg">
                ${asset.underlyingValue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
              <p className="text-xs text-slate-500 font-semibold mb-1">
                Symbol
              </p>
              <p className="font-bold text-slate-900 text-lg">{asset.symbol}</p>
            </div>
          </div>

          {/* Token Contract */}
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <Shield className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                Token Contract
              </p>
              <p
                className="font-mono text-[11px] truncate text-slate-700 font-medium"
                title={asset.tokenContractAddress}
              >
                {asset.tokenContractAddress.slice(0, 10)}...
                {asset.tokenContractAddress.slice(-6)}
              </p>
            </div>
          </div>
        </CardContent>

        {/* Footer - Action Buttons */}
        <CardFooter className="pt-0 pb-4 px-4">
          <div className="flex w-full gap-2">
            {/* View Details Button - Subtle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/assets/${asset.id}`)}
              className="flex-1 group/btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Eye className="h-4 w-4" />
              <span>View</span>
            </motion.button>

            {/* Trade Button - Blue Gradient */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const url = `/transfer?asset=${encodeURIComponent(
                  asset.id
                )}&symbol=${encodeURIComponent(asset.symbol)}`;
                router.push(url);
              }}
              className="flex-1 group/btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-br from-[#172E7F] to-[#2A5FA6] text-white text-sm font-bold hover:from-[#1a3490] hover:to-[#2f67b8] transition-all duration-200 shadow-[0_4px_16px_rgba(23,46,127,0.25)] hover:shadow-[0_6px_24px_rgba(23,46,127,0.35)]"
            >
              <span>Trade</span>
              <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
            </motion.button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 font-semibold">{label}</p>
      <p className="font-bold text-slate-900 text-base">{value}</p>
    </div>
  );
}
