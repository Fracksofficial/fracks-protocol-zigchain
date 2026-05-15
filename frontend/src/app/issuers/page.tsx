"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/use-wallet";
import { ROLE_WALLETS } from "@/lib/zigchain-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/backend";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type IssuerOption = {
  address: string;
  label: string;
};

type IndexedAsset = {
  id: string;
  factoryAssetId?: number | null;
  tokenContract: string;
  name: string;
  symbol: string;
  issuerWallet?: string | null;
  legalOwner?: string | null;
  description?: string | null;
  referenceId?: string | null;
  metadata?: any;
};

type IndexedBalance = {
  tokenContract: string;
  walletAddress: string;
  balance: string;
  updatedAt: string;
};

export default function IssuersPage() {
  const { address: walletAddress } = useWallet();
  const [assets, setAssets] = useState<IndexedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssuer, setSelectedIssuer] = useState<string>("");
  const [balances, setBalances] = useState<Record<string, IndexedBalance[]>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  const issuerOptions = useMemo<IssuerOption[]>(() => {
    const options: IssuerOption[] = [];
    const seen = new Set<string>();

    const addOption = (address?: string | null, label?: string) => {
      if (!address) return;
      const normalized = address.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      options.push({
        address,
        label: label || address,
      });
    };

    addOption(ROLE_WALLETS.fundRealEstate, "Fund Real Estate");
    addOption(ROLE_WALLETS.fundStocks, "Fund Stocks");
    addOption(walletAddress, "Connected Wallet");

    assets.forEach((asset) => {
      const issuer = asset.issuerWallet || asset.legalOwner;
      if (issuer) {
        addOption(issuer, `Issuer ${issuer.slice(0, 10)}...`);
      }
    });

    return options;
  }, [assets, walletAddress]);

  const filteredAssets = useMemo(() => {
    if (!selectedIssuer) return [];
    const target = selectedIssuer.toLowerCase();
    return assets.filter((asset) => {
      const issuer = asset.issuerWallet || asset.legalOwner;
      return issuer?.toLowerCase() === target;
    });
  }, [assets, selectedIssuer]);

  useEffect(() => {
    let cancelled = false;
    const loadAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const indexedAssets = await apiFetch<IndexedAsset[]>("/indexed/assets");
        if (!cancelled) {
          setAssets(indexedAssets);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load indexed assets");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (filteredAssets.length === 0) {
      setBalances({});
      return;
    }

    let cancelled = false;
    const loadBalances = async () => {
      setLoadingBalances(true);
      try {
        const results = await Promise.all(
          filteredAssets.map(async (asset) => {
            const tokenBalances = await apiFetch<IndexedBalance[]>(
              `/indexed/tokens/${asset.tokenContract}/balances`
            );
            return [asset.tokenContract, tokenBalances] as const;
          })
        );

        if (!cancelled) {
          const next: Record<string, IndexedBalance[]> = {};
          results.forEach(([contract, tokenBalances]) => {
            next[contract] = tokenBalances;
          });
          setBalances(next);
        }
      } finally {
        if (!cancelled) {
          setLoadingBalances(false);
        }
      }
    };

    loadBalances();
    return () => {
      cancelled = true;
    };
  }, [filteredAssets]);

  useEffect(() => {
    if (!selectedIssuer && issuerOptions.length > 0) {
      setSelectedIssuer(issuerOptions[0].address);
    }
  }, [issuerOptions, selectedIssuer]);

  const hasNonZeroBalance = (balance: string) => {
    try {
      return BigInt(balance) > 0n;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200/70 bg-white/80 shadow-sm">
        <CardHeader>
          <CardTitle>Issuer Portfolio</CardTitle>
          <CardDescription>
            View assets issued by a specific issuer and see which investors hold
            their tokens, sourced from indexed balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">
                Select Issuer
              </div>
              <Select value={selectedIssuer} onValueChange={setSelectedIssuer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose issuer" />
                </SelectTrigger>
                <SelectContent>
                  {issuerOptions.map((issuer) => (
                    <SelectItem key={issuer.address} value={issuer.address}>
                      {issuer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500">
                Issuers are derived from indexed token roles. If you do not see an
                issuer, check the indexer or add a user wallet to the backend.
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Refresh assets
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/70 bg-white/80 shadow-sm">
        <CardHeader>
          <CardTitle>Tracked Holder Wallets</CardTitle>
          <CardDescription>
            Add wallets to the backend so the indexer can track their balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const wallet = String(data.get("wallet") || "").trim();
              if (!wallet) return;
              try {
                await apiFetch("/indexed/wallets", {
                  method: "POST",
                  body: JSON.stringify({ walletAddress: wallet }),
                });
                form.reset();
                toast.success("Wallet added to tracking list");
              } catch (error: any) {
                toast.error(error.message || "Failed to add wallet");
              }
            }}
          >
            <Input
              name="wallet"
              placeholder="zig1..."
              className="flex-1 bg-white/90 border-slate-200/70 focus:bg-white"
            />
            <Button type="submit">Track Wallet</Button>
          </form>
          <div className="text-xs text-slate-500">
            The indexer will pick this up on the next cycle (30s) and balances
            will appear under the issuer’s assets.
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/70 bg-white/80 shadow-sm">
        <CardHeader>
          <CardTitle>Issued Assets</CardTitle>
          <CardDescription>
            Assets linked to the selected issuer. Click an asset to review details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">Loading assets...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Failed to load assets: {error}</div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-sm text-slate-500">
              No assets found for this issuer.
            </div>
          ) : (
            <div className="space-y-6">
              {filteredAssets.map((asset) => {
                const tokenBalances = balances[asset.tokenContract] || [];
                const holders = tokenBalances.filter((entry) =>
                  hasNonZeroBalance(entry.balance)
                );
                return (
                  <Card key={asset.tokenContract} className="border border-slate-200/70">
                    <CardHeader className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{asset.name}</CardTitle>
                          <CardDescription>
                            {asset.symbol} - Asset ID {asset.factoryAssetId ?? asset.id}
                          </CardDescription>
                        </div>
                        <Link
                          href={`/assets/${asset.factoryAssetId ?? asset.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Asset
                        </Link>
                      </div>
                      <div className="text-xs text-slate-500">
                        Token Contract: {asset.tokenContract}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investor</TableHead>
                            <TableHead>Wallet</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {holders.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-sm text-slate-500">
                                {loadingBalances
                                  ? "Loading balances..."
                                  : "No indexed holders for this asset."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            holders.map((holder) => (
                              <TableRow key={holder.walletAddress}>
                                <TableCell>Investor</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {holder.walletAddress}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {loadingBalances ? "..." : holder.balance}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
