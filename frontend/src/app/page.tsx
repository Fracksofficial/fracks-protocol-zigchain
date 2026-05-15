"use client";

import { StatsCard } from "@/components/ui/stats-card";
import { AssetAnalyticsChart } from "@/components/ui/asset-analytics-chart";
import { AssetAnalyticsPieChart } from "@/components/rwa/asset-analytics-piechart";
import { AssetsList } from "@/components/rwa/assets-list";
import { TopTransactions } from "@/components/rwa/top-transactions";
import { useWallet } from "@/hooks/use-wallet";
import { useAssetsContext } from "@/contexts/assets-context";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/backend";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Page() {
  const { address } = useWallet();
  const { assets, loading } = useAssetsContext();
  const [issuanceSeries, setIssuanceSeries] = useState<
    { month: string; issued: number; redeemed: number; net: number }[]
  >([]);

  const assetClassData = useMemo(() => {
    const totals = {
      "Real Estate": 0,
      Commodities: 0,
      "Private Credit": 0,
      Equity: 0,
    } as Record<string, number>;

    assets.forEach((asset) => {
      const value = Number(asset.underlyingValue) || 0;
      switch (asset.assetType) {
        case "real-estate":
          totals["Real Estate"] += value;
          break;
        case "commodity":
          totals["Commodities"] += value;
          break;
        case "debt":
          totals["Private Credit"] += value;
          break;
        case "equity":
          totals["Equity"] += value;
          break;
        default:
          totals["Real Estate"] += value;
      }
    });

    const totalValue = Object.values(totals).reduce((sum, val) => sum + val, 0);
    if (totalValue === 0) return undefined;

    const toPercent = (val: number) =>
      Math.round((val / totalValue) * 1000) / 10;

    return [
      {
        name: "Real Estate",
        value: toPercent(totals["Real Estate"]),
        color: "#2A5FA6",
      },
      {
        name: "Commodities",
        value: toPercent(totals["Commodities"]),
        color: "#92BFFF",
      },
      {
        name: "Private Credit",
        value: toPercent(totals["Private Credit"]),
        color: "#BC953D",
      },
      { name: "Equity", value: toPercent(totals["Equity"]), color: "#94E9B8" },
    ];
  }, [assets]);

  useEffect(() => {
    let isMounted = true;
    const loadIssuanceSeries = async () => {
      try {
        const [issuance, redemptions] = await Promise.all([
          apiFetch<Array<{ amount: string; createdAt: string }>>(
            "/issuance-requests",
          ).catch(() => []),
          apiFetch<Array<{ amount: string; createdAt: string }>>(
            "/redemption-requests",
          ).catch(() => []),
        ]);

        const now = new Date();
        const months: { key: string; label: string }[] = [];
        for (let i = 9; i >= 0; i -= 1) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({
            key: `${date.getFullYear()}-${date.getMonth()}`,
            label: date.toLocaleString("en-US", { month: "short" }),
          });
        }

        const bucket = new Map(
          months.map((month) => [month.key, { issued: 0, redeemed: 0 }]),
        );

        issuance.forEach((item) => {
          const createdAt = new Date(item.createdAt);
          const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
          const entry = bucket.get(key);
          if (entry) {
            entry.issued += Number(item.amount) || 0;
          }
        });

        redemptions.forEach((item) => {
          const createdAt = new Date(item.createdAt);
          const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
          const entry = bucket.get(key);
          if (entry) {
            entry.redeemed += Number(item.amount) || 0;
          }
        });

        const series = months.map((month) => {
          const values = bucket.get(month.key) || { issued: 0, redeemed: 0 };
          return {
            month: month.label,
            issued: values.issued,
            redeemed: values.redeemed,
            net: values.issued - values.redeemed,
          };
        });

        if (isMounted) {
          setIssuanceSeries(series);
        }
      } catch (error) {
        console.error("Failed to load issuance series:", error);
      }
    };

    loadIssuanceSeries();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-8 glass-panel rounded-[22px]">
      <h1 className="text-3xl font-semibold mb-6">Market Overview</h1>
      <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-700 shadow-sm">
        Investors can browse markets and assets here. Admin and issuer actions
        live under Token Admin and Issuance.
      </div>
      <div className="flex flex-row items-center justify-between gap-2">
        <StatsCard
          heading="Distibuted Asset Value"
          value={formatCurrency(
            assets.reduce((sum, asset) => sum + asset.underlyingValue, 0),
          )}
          className="bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] text-white"
        />
        <StatsCard heading="Total Asset Holders" value="500" />
        <StatsCard heading="Active Users" value="3,184" />
        <StatsCard heading="Total Assets" value={assets.length.toString()} />
        <StatsCard heading="Active Issuers" value="50" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 border border-slate-200/70 bg-white/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Investors
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Investor Onboarding & Dashboard
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Complete KYC, verify your identity, and track your holdings in
                one guided flow.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 px-3 py-2 text-xs font-semibold text-blue-700">
              Guided flow
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Start KYC and create OnChainID
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Monitor verification and claims
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Track portfolio and activity
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6]"
              onClick={() => (window.location.href = "/identity")}
            >
              Start KYC
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/assets")}
            >
              Browse Assets
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-200/70 bg-white/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                Issuers
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Issuer Dashboard</h2>
              <p className="mt-2 text-sm text-slate-600">
                Create assets, manage issuance, and review compliance with a
                single command center.
              </p>
            </div>
            <div className="rounded-2xl bg-linear-to-br from-amber-300/20 to-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-700">
              Admin tools
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Review issuance requests
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Track token circulation
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Manage compliance workflows
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="bg-gradient-to-tr from-[#B08933] to-[#E2B65B] text-slate-900"
              onClick={() => (window.location.href = "/issuers")}
            >
              Issuer Workspace
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/token-admin")}
            >
              Token Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-2 flex flex-row items-center justify-between gap-2">
        <div className="glass-card rounded-2xl p-6 w-[60%] flex flex-col">
          <h1 className="text-2xl font-semibold mb-6">Asset Analytics</h1>
          <AssetAnalyticsChart
            data={issuanceSeries.length > 0 ? issuanceSeries : undefined}
          />
        </div>
        <div className="glass-card rounded-2xl p-6 w-[40%] flex flex-col">
          <h1 className="text-2xl font-semibold mb-6">Holding Catagories</h1>
          <AssetAnalyticsPieChart data={assetClassData} />
        </div>
      </div>

      <div className="pt-2 flex flex-row items-stretch gap-2">
        <div className="w-[40%] glass-card rounded-[20px] p-6 flex flex-col">
          <h1 className="text-2xl font-semibold mb-6">Tokenized Assets</h1>
          <div className="flex-1 min-h-0 overflow-auto">
            <AssetsList assets={assets} loading={loading} limit={10} />
          </div>
        </div>
        <div className="w-[60%] glass-card rounded-[20px] p-6 flex flex-col">
          <h1 className="text-2xl font-semibold mb-6">Top Transactions</h1>
          <div className="flex-1 min-h-0 overflow-auto">
            <TopTransactions limit={10} />
          </div>
        </div>
      </div>
    </div>
  );
}
