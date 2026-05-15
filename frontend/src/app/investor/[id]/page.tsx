"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWallet } from "@/hooks/use-wallet";
import { useAssetsContext } from "@/contexts/assets-context";
import { formatCurrency } from "@/lib/utils";
import {
  RefreshCw,
  Wallet,
  TrendingUp,
  Layers,
  ExternalLink,
} from "lucide-react";

interface HoldingRow {
  assetId: string;
  assetName: string;
  symbol: string;
  tokenContract: string;
  tokenPrice: number;
  rawBalance: number;
  balance: number;
  value: number;
}

export default function InvestorDashboardPage() {
  const params = useParams();
  const { address, trexClient, connectKeplr, isConnected } = useWallet();
  const routeWallet = typeof params?.id === "string" ? params.id : undefined;
  const investorWallet = routeWallet || address || "";

  const { assets, loading: assetsLoading, loadAssets } = useAssetsContext();
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadHoldings = async () => {
      if (!trexClient || !investorWallet || assets.length === 0) {
        if (isActive) {
          setHoldings([]);
        }
        return;
      }

      setLoadingHoldings(true);
      try {
        const rows = await Promise.all(
          assets.map(async (asset) => {
            const raw = await trexClient
              .getBalanceForToken(asset.tokenContractAddress, investorWallet)
              .catch(() => "0");
            const rawBalance = Number(raw) || 0;
            const balance = rawBalance / 1_000_000;
            const value = balance * (asset.tokenPrice || 0);
            return {
              assetId: asset.id,
              assetName: asset.name,
              symbol: asset.symbol,
              tokenContract: asset.tokenContractAddress,
              tokenPrice: asset.tokenPrice,
              rawBalance,
              balance,
              value,
            };
          }),
        );

        if (isActive) {
          setHoldings(rows.filter((row) => row.rawBalance > 0));
        }
      } catch (error) {
        console.error("Failed to load holdings:", error);
        if (isActive) {
          setHoldings([]);
        }
      } finally {
        if (isActive) {
          setLoadingHoldings(false);
        }
      }
    };

    loadHoldings();
    return () => {
      isActive = false;
    };
  }, [trexClient, investorWallet, assets]);

  const totalValue = useMemo(
    () => holdings.reduce((sum, row) => sum + row.value, 0),
    [holdings],
  );
  const totalTokens = useMemo(
    () => holdings.reduce((sum, row) => sum + row.balance, 0),
    [holdings],
  );

  if (!isConnected) {
    return (
      <div className="p-8 glass-panel rounded-[22px]">
        <div className="text-center py-12">
          <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Investor Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to load portfolio data.
          </p>
          <Button
            onClick={connectKeplr}
            size="lg"
            className="bg-linear-to-tr from-[#172E7F] to-[#2A5FA6]"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 glass-panel rounded-[22px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-linear-to-tr from-[#172E7F] to-[#2A5FA6]">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Investor Portfolio</h1>
            <p className="text-sm text-gray-600">
              Wallet:{" "}
              <span className="font-mono text-xs break-all">
                {investorWallet}
              </span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            loadAssets();
          }}
          disabled={assetsLoading || loadingHoldings}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${
              assetsLoading || loadingHoldings ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated based on token price
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Tokens Held
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {totalTokens.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {holdings.length} assets
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Asset Exposure
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span className="text-xl font-semibold">{holdings.length}</span>
            <span className="text-xs text-muted-foreground">
              active holdings
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white rounded-2xl">
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>
            Token balances for assets in your wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assetsLoading || loadingHoldings ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading portfolio...
            </div>
          ) : holdings.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No token holdings found for this wallet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Token Price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((row) => (
                    <TableRow key={row.tokenContract}>
                      <TableCell className="font-medium">
                        {row.assetName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.symbol}</Badge>
                      </TableCell>
                      <TableCell>
                        {row.balance.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(row.tokenPrice || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          {formatCurrency(row.value)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9"
                            onClick={() =>
                              window.open(`/assets/${row.assetId}`, "_self")
                            }
                          >
                            View Asset
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-9 bg-linear-to-tr from-[#172E7F] to-[#2A5FA6]"
                            onClick={() =>
                              window.open(
                                `/transfer?asset=${encodeURIComponent(
                                  row.assetId,
                                )}&symbol=${encodeURIComponent(row.symbol)}`,
                                "_self",
                              )
                            }
                          >
                            Transfer Tokens
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
