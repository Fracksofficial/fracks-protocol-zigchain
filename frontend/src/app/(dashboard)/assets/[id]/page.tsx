"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Shield,
  FileText,
  Users,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/hooks/use-wallet";
import { useAssetsContext } from "@/contexts/assets-context";
import { RWAAsset } from "@/types/rwa";
import { formatCurrency } from "@/lib/utils";

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { address } = useWallet();
  const { assets, loading } = useAssetsContext();
  const [asset, setAsset] = useState<RWAAsset | null>(null);

  useEffect(() => {
    if (assets.length > 0) {
      const found = assets.find((a) => a.id === resolvedParams.id);
      setAsset(found || null);
    }
  }, [assets, resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Asset Not Found</h2>
          <p className="text-muted-foreground">
            The asset you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push("/assets")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

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
    <div className="p-8 glass-panel rounded-[22px]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Button
          variant="ghost"
          onClick={() => router.push("/assets")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assets
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <Icon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">{asset.name}</h1>
              <p className="text-gray-600 flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {asset.location}
              </p>
            </div>
          </div>
          <Badge
            className={
              asset.complianceStatus === "compliant"
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-yellow-100 text-yellow-700 border border-yellow-200"
            }
          >
            {asset.complianceStatus}
          </Badge>
        </div>
      </motion.div>

      <Alert className="mb-6">
        <AlertDescription>
          Investors can review asset details and trade. Token admins manage
          issuance and compliance from the Token Admin page.
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid gap-2 md:grid-cols-4 mb-6">
        <Card className="bg-white rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[17px] font-semibold">
              Underlying Value
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(asset.underlyingValue)}
            </div>
            <p className="text-xs text-gray-500">{asset.currency}</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[17px] font-semibold">
              Total Supply
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {asset.totalSupply.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">{asset.symbol} tokens</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[17px] font-semibold">
              Tokenized Amount
            </CardTitle>
            <Building2 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {asset.tokenizedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              {((asset.tokenizedAmount / asset.totalSupply) * 100).toFixed(1)}%
              tokenized
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[17px] font-semibold">
              Token Price
            </CardTitle>
            <DollarSign className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${asset.tokenPrice.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">per token</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="rounded-2xl bg-white border border-slate-200/70 p-1 shadow-sm">
          <TabsTrigger
            value="overview"
            className="rounded-xl px-4 py-1 text-sm data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="compliance"
            className="rounded-xl px-4 py-1 text-sm data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white"
          >
            Compliance
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="rounded-xl px-4 py-1 text-sm data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger
            value="blockchain"
            className="rounded-xl px-4 py-1 text-sm data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white"
          >
            Blockchain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-white rounded-2xl">
            <CardHeader>
              <CardTitle>Asset Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{asset.description}</p>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl">
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Asset Type</p>
                  <p className="font-medium capitalize">
                    {asset.assetType.replace("-", " ")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Symbol</p>
                  <p className="font-medium">{asset.symbol}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Issuer</p>
                  <p className="font-medium font-mono text-xs">
                    {asset.issuerAddress}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Issuance Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {asset.issuanceDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Requirements</CardTitle>
              <CardDescription>
                Investment requirements and restrictions for this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">KYC Required</p>
                      <p className="text-sm text-muted-foreground">
                        Identity verification mandatory
                      </p>
                    </div>
                  </div>
                  <Badge variant={asset.kycRequired ? "default" : "secondary"}>
                    {asset.kycRequired ? "Required" : "Not Required"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">AML Checks</p>
                      <p className="text-sm text-muted-foreground">
                        Anti-money laundering compliance
                      </p>
                    </div>
                  </div>
                  <Badge variant={asset.amlRequired ? "default" : "secondary"}>
                    {asset.amlRequired ? "Required" : "Not Required"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Accredited Investors Only</p>
                      <p className="text-sm text-muted-foreground">
                        Restricted to accredited investors
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      asset.accreditedInvestorsOnly ? "default" : "secondary"
                    }
                  >
                    {asset.accreditedInvestorsOnly ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legal Documents</CardTitle>
              <CardDescription>
                Official documentation for this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              {asset.documents && asset.documents.length > 0 ? (
                <div className="space-y-2">
                  {asset.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <p className="font-medium">{doc.name}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blockchain" className="space-y-4">
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Dedicated Token Contract
              </CardTitle>
              <CardDescription>
                This asset has its own CW3643 token contract following ERC-3643
                standard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">
                        Independent Token Contract
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Each asset has a separate token contract with its own
                        balances, supply, and symbol ({asset.symbol})
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Token Contract Address
                    </p>
                    <p className="font-mono text-sm bg-background p-3 rounded border break-all">
                      {asset.tokenContractAddress}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Asset ID (Factory)
                    </p>
                    <p className="font-mono text-sm bg-secondary p-2 rounded">
                      {asset.id}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Token Symbol
                    </p>
                    <p className="font-mono text-sm bg-secondary p-2 rounded">
                      {asset.symbol}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Chain ID</p>
                    <p className="font-mono text-sm bg-secondary p-2 rounded">
                      {asset.chainId}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Native Denom
                    </p>
                    <p className="font-mono text-sm bg-secondary p-2 rounded">
                      {asset.tokenDenom}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-2">
                    Shared Compliance Infrastructure:
                  </p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• Identity Registry: Shared across all assets</li>
                    <li>• Trusted Issuers: Common issuer registry</li>
                    <li>• Claim Topics: Unified KYC/AML requirements</li>
                    <li>• Compliance Module: Centralized rule enforcement</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-2">
        <Button
          size="lg"
          onClick={() =>
            router.push(`/transfer?asset=${asset.id}&symbol=${asset.symbol}`)
          }
          className="bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6]"
        >
          Trade Tokens
        </Button>
        {/* <Button
          size="lg"
          variant="outline"
          onClick={() => router.push("/transfer")}
        >
          Transfer Tokens
        </Button> */}
      </div>
    </div>
  );
}
