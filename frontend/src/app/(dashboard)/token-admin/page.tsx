"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/use-wallet";
import { useAssetsContext } from "@/contexts/assets-context";
import { TokenSelector } from "@/components/rwa/token-selector";
import { AdminPanel } from "@/components/trex/admin-panel";
import { IssuanceRedemptionManager } from "@/components/trex/issuance-redemption-manager";
import { ComplianceRulesManager } from "@/components/trex/compliance-rules-manager";
import { usePermissions } from "@/hooks/use-permissions";

function TokenAdminPageContent() {
  const searchParams = useSearchParams();
  const { isConnected, connectKeplr, address, trexClient } = useWallet();
  const {
    assets,
    loading: assetsLoading,
    error,
    loadAssets: refreshAssets,
  } = useAssetsContext();

  const [selectedTokenContract, setSelectedTokenContract] = useState<
    string | null
  >(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedDecimals, setSelectedDecimals] = useState<number>(6);
  const { permissions, canSeeAdminTab } = usePermissions({
    trexClient,
    walletAddress: address,
    tokenContract: selectedTokenContract,
  });

  // Auto-select token from URL parameters
  useEffect(() => {
    const assetId = searchParams.get("asset");
    const symbol = searchParams.get("symbol");

    if (assetId && symbol && assets.length > 0 && !selectedTokenContract) {
      const asset = assets.find((a) => a.id === assetId || a.symbol === symbol);
      if (asset) {
        setSelectedTokenContract(asset.tokenContractAddress);
        setSelectedSymbol(asset.symbol);
        setSelectedDecimals(6);
      }
    }
  }, [searchParams, assets, selectedTokenContract]);

  const handleTokenSelect = (
    contract: string,
    _assetId: string,
    symbol: string,
  ) => {
    setSelectedTokenContract(contract);
    setSelectedSymbol(symbol);
  };

  const refreshAll = () => {
    refreshAssets();
  };

  const isLoading = assetsLoading;

  if (!isConnected) {
    return (
      <div className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <h1 className="text-3xl font-bold">Token Admin</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to access admin controls
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
      <div className="mb-6">
        <Link href="/transfer">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Manage
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mt-4">Token Admin Controls</h1>
        <p className="text-sm text-gray-600">
          Issuance, redemption, and compliance operations
        </p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          Token owner can pause and manage agents. Token issuer can mint and
          request issuance. Token controller approves redemptions and can batch
          KYC. TIR owner manages trusted issuers. Compliance owner configures
          transfer rules.
        </AlertDescription>
      </Alert>

      {selectedTokenContract ? (
        <Card className="bg-white rounded-2xl mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    Selected Token: {selectedSymbol}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Admin actions apply to this token.
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
      ) : (
        <Card className="bg-white rounded-2xl mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Select a token</h3>
                  <p className="text-sm text-gray-600">
                    Choose an asset token to manage admin operations.
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

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-100 w-full rounded-2xl" />
          <Skeleton className="h-100 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {!canSeeAdminTab ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                Your wallet does not have admin permissions for these controls.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                {selectedTokenContract && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <AdminPanel
                      tokenContract={selectedTokenContract || undefined}
                      tokenSymbol={selectedSymbol}
                      tokenDecimals={selectedDecimals}
                      permissions={permissions}
                      onUpdate={refreshAll}
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {selectedTokenContract && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <IssuanceRedemptionManager
                      tokenContract={selectedTokenContract || ""}
                      permissions={permissions}
                      onUpdate={refreshAll}
                    />
                  </motion.div>
                )}

                {permissions.isComplianceOwner && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <ComplianceRulesManager onUpdate={refreshAll} />
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TokenAdminPage() {
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
      <TokenAdminPageContent />
    </Suspense>
  );
}
