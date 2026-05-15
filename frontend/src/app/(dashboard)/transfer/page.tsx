"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/hooks/use-wallet";
import { useAssetsContext } from "@/contexts/assets-context";
import { useTokenBalance } from "@/hooks/use-factory-assets";
import { TokenSelector } from "@/components/rwa/token-selector";
import { TokenTransfer } from "@/components/trex/token-transfer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetAnalyticsChart } from "@/components/ui/asset-analytics-chart";
import { apiFetch } from "@/lib/backend";

function ManagePageContent() {
  const searchParams = useSearchParams();
  const { isConnected, connectKeplr, address, trexClient } = useWallet();
  const {
    assets,
    loading: assetsLoading,
    error,
    loadAssets: refreshAssets,
  } = useAssetsContext();

  // Multi-token state
  const [selectedTokenContract, setSelectedTokenContract] = useState<
    string | null
  >(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedDecimals, setSelectedDecimals] = useState<number>(6);
  // Identity state
  const [userIdentity, setUserIdentity] = useState<any>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(false);
  const [assetIssuanceSeries, setAssetIssuanceSeries] = useState<
    { month: string; issued: number; redeemed: number; net: number }[]
  >([]);

  // Get balance for selected token
  const { balance: tokenBalance, isLoading: balanceLoading } = useTokenBalance(
    trexClient,
    selectedTokenContract,
    address,
  );

  const requestedAssetId = useMemo(() => searchParams.get("asset"), [searchParams]);
  const requestedSymbol = useMemo(() => searchParams.get("symbol"), [searchParams]);

  // Auto-select token from URL parameters
  useEffect(() => {
    if ((!requestedAssetId && !requestedSymbol) || assets.length === 0) {
      return;
    }

    const asset = assets.find(
      (a) => a.id === requestedAssetId || a.symbol === requestedSymbol,
    );
    if (!asset) {
      return;
    }

    if (selectedTokenContract === asset.tokenContractAddress && selectedSymbol === asset.symbol) {
      return;
    }

    setSelectedTokenContract(asset.tokenContractAddress);
    setSelectedSymbol(asset.symbol);
    setSelectedDecimals(6);
  }, [
    requestedAssetId,
    requestedSymbol,
    assets,
    selectedTokenContract,
    selectedSymbol,
  ]);

  // Load user identity
  useEffect(() => {
    const loadUserIdentity = async () => {
      if (!trexClient || !address) return;

      setLoadingIdentity(true);
      try {
        const identity = await trexClient.getUserIdentity(address);
        setUserIdentity(identity);
      } catch (err) {
        console.log("No identity found for user");
        setUserIdentity(null);
      } finally {
        setLoadingIdentity(false);
      }
    };

    loadUserIdentity();
  }, [trexClient, address]);

  useEffect(() => {
    let isMounted = true;

    const loadAssetSeries = async () => {
      if (!selectedTokenContract) {
        setAssetIssuanceSeries([]);
        return;
      }

      try {
        const query = `?tokenContract=${encodeURIComponent(selectedTokenContract)}`;
        const [issuance, redemptions] = await Promise.all([
          apiFetch<Array<{ amount: string; createdAt: string }>>(
            `/issuance-requests${query}`,
          ).catch(() => []),
          apiFetch<Array<{ amount: string; createdAt: string }>>(
            `/redemption-requests${query}`,
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
          setAssetIssuanceSeries(series);
        }
      } catch (error) {
        console.error("Failed to load asset series:", error);
        if (isMounted) {
          setAssetIssuanceSeries([]);
        }
      }
    };

    loadAssetSeries();
    return () => {
      isMounted = false;
    };
  }, [selectedTokenContract]);

  const handleTokenSelect = (
    contract: string,
    _assetId: string,
    symbol: string,
  ) => {
    setSelectedTokenContract(contract);
    setSelectedSymbol(symbol);
  };

  // Refresh all data
  const refreshAll = () => {
    refreshAssets();
    // Reload identity
    if (trexClient && address) {
      trexClient
        .getUserIdentity(address)
        .then(setUserIdentity)
        .catch(() => setUserIdentity(null));
    }
  };

  const isLoading = assetsLoading || balanceLoading || loadingIdentity;

  if (!isConnected) {
    return (
      <div className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <h1 className="text-3xl font-bold">TREX Token Management</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to access token management features
          </p>
          <Button size="lg" onClick={connectKeplr}>
            Connect Keplr Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 glass-panel rounded-[22px]">
      {/* Header */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mt-4">Token Management</h1>
        <p className="text-sm text-gray-600">
          Transfer tokens and manage identity
        </p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          Use this page for token transfers. Identity and KYC tools live on the
          Investor KYC and KYC Provider pages.
        </AlertDescription>
      </Alert>

      {/* Selected Token Info Card */}
      {selectedTokenContract ? (
        <Card className="bg-white rounded-2xl mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-linear-to-br from-blue-50 to-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">
                  Selected Token: {selectedSymbol}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  All operations will apply to this token only.
                </p>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Token Symbol</p>
                    <p className="font-mono font-semibold text-gray-900">
                      {selectedSymbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Your Balance</p>
                    <p className="font-semibold text-gray-900">
                      {isLoading
                        ? "..."
                        : (parseInt(tokenBalance) / 1000000).toFixed(2)}{" "}
                      {selectedSymbol}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Contract Address
                    </p>
                    <p className="font-mono text-xs text-gray-700 break-all">
                      {selectedTokenContract}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white rounded-2xl mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-linear-to-br from-blue-50 to-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Select a token</h3>
                  <p className="text-sm text-gray-600">
                    Choose an asset token to manage transfers and identity.
                  </p>
                </div>
                <TokenSelector
                  selectedTokenContract={selectedTokenContract}
                  onSelect={handleTokenSelect}
                  className="max-w-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedTokenContract && (
        <Card className="bg-white rounded-2xl mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Asset Analytics</h2>
                <p className="text-sm text-gray-600">
                  Issued vs redeemed tokens for {selectedSymbol || "this asset"}
                </p>
              </div>
            </div>
            <AssetAnalyticsChart
              data={
                assetIssuanceSeries.length > 0 ? assetIssuanceSeries : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-100 w-full rounded-2xl" />
          <Skeleton className="h-100 w-full rounded-2xl" />
        </div>
      ) : selectedTokenContract ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TokenTransfer
            tokenContract={selectedTokenContract || undefined}
            tokenSymbol={selectedSymbol}
            tokenDecimals={selectedDecimals}
            userBalance={tokenBalance}
            userIdentity={userIdentity}
            onSuccess={refreshAll}
          />
        </motion.div>
      ) : (
        <Alert className="mb-6">
          <AlertDescription>Select a token above to continue.</AlertDescription>
        </Alert>
      )}

      {/* Info Footer */}
      <div className="mt-6 p-4 rounded-2xl bg-white text-sm text-gray-600">
        <p className="font-medium mb-2 text-gray-900">Important Information:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            All transfers require both sender and recipient to have verified
            identities
          </li>
          <li>
            Identity verification requires KYC and AML claims from trusted
            issuers
          </li>
          <li>OnChainID contracts store your identity claims on-chain</li>
        </ul>
      </div>
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 glass-panel rounded-[22px]">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <ManagePageContent />
    </Suspense>
  );
}
