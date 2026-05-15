"use client";

import { motion } from "framer-motion";
import { Building2, MapPin, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { RWAAsset } from "@/types/rwa";
import Link from "next/link";

interface AssetsListProps {
  assets: RWAAsset[];
  loading?: boolean;
  limit?: number;
}

export function AssetsList({ assets, loading, limit = 5 }: AssetsListProps) {
  const displayAssets = limit ? assets.slice(0, limit) : assets;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No assets found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayAssets.map((asset, index) => (
        <Link key={asset.id} href={`/assets/${asset.id}`} className="block">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-blue-50">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{asset.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {asset.location}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {asset.assetType}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-semibold text-sm">
                  {formatCurrency(asset.underlyingValue)}
                </p>
                <p className="text-xs text-muted-foreground">Value</p>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm text-green-600">
                    {(
                      (asset.tokenizedAmount / asset.totalSupply) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground">Tokenized</p>
              </div>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
