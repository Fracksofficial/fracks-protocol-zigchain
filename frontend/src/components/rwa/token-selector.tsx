'use client';

import { Coins } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAssetsContext } from '@/contexts/assets-context';

interface TokenSelectorProps {
  selectedTokenContract: string | null;
  onSelect: (contract: string, assetId: string, symbol: string) => void;
  className?: string;
}

export function TokenSelector({ selectedTokenContract, onSelect, className }: TokenSelectorProps) {
  const { assets, loading } = useAssetsContext();

  return (
    <Select
      value={selectedTokenContract ?? ""}
      onValueChange={(value) => {
        if (!value) return;
        const asset = assets.find((item) => item.tokenContractAddress === value);
        if (asset) {
          onSelect(asset.tokenContractAddress, asset.id, asset.symbol);
        }
      }}
      disabled={loading}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={loading ? "Loading tokens..." : "Select token..."} />
      </SelectTrigger>
      <SelectContent>
        {assets.length === 0 && !loading ? (
          <div className="p-2 text-sm text-muted-foreground">No tokens found.</div>
        ) : (
          assets.map((asset) => (
            <SelectItem key={asset.id} value={asset.tokenContractAddress}>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                <span className="font-medium">{asset.symbol}</span>
                <span className="text-muted-foreground text-xs">
                  ({asset.name})
                </span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
