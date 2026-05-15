"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Grid3x3,
  List,
  TrendingUp,
  Building2,
  DollarSign,
  MapPin,
  Calendar,
  Users,
  MoreVertical,
  Shield,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetCard } from "@/components/rwa/asset-card";
import { ConnectWalletCard } from "@/components/wallet/connect-wallet-card";
import { useAssetsContext } from "@/contexts/assets-context";
import { useWallet } from "@/hooks/use-wallet";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { RWAAsset } from "@/types/rwa";

export default function AssetsPage() {
  const { address, connectKeplr, isConnecting } = useWallet();
  const { assets, loading, selectedAsset, setSelectedAsset } =
    useAssetsContext();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("value-desc");

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.location.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      result = result.filter((asset) => asset.assetType === filterType);
    }

    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter(
        (asset) => asset.complianceStatus === filterStatus,
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "value-desc":
          return b.underlyingValue - a.underlyingValue;
        case "value-asc":
          return a.underlyingValue - b.underlyingValue;
        case "tokenized-desc":
          return (
            b.tokenizedAmount / b.totalSupply -
            a.tokenizedAmount / a.totalSupply
          );
        case "tokenized-asc":
          return (
            a.tokenizedAmount / a.totalSupply -
            b.tokenizedAmount / b.totalSupply
          );
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [assets, searchQuery, filterType, filterStatus, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalValue = assets.reduce(
      (sum, asset) => sum + asset.underlyingValue,
      0,
    );
    const avgTokenization =
      assets.length > 0
        ? assets.reduce((sum, asset) => {
            const supply = Number(asset.totalSupply) || 0;
            const tokenized = Number(asset.tokenizedAmount) || 0;
            return sum + (supply > 0 ? (tokenized / supply) * 100 : 0);
          }, 0) / assets.length
        : 0;
    const compliantCount = assets.filter(
      (a) => a.complianceStatus === "compliant",
    ).length;

    return {
      totalAssets: assets.length,
      totalValue,
      avgTokenization,
      compliantPercentage:
        assets.length > 0 ? (compliantCount / assets.length) * 100 : 0,
      byType: assets.reduce(
        (acc, asset) => {
          acc[asset.assetType] = (acc[asset.assetType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }, [assets]);

  const assetTypes = [
    {
      value: "real-estate",
      label: "Real Estate",
      icon: Building2,
      color: "bg-blue-500",
    },
    {
      value: "commodity",
      label: "Commodities",
      icon: TrendingUp,
      color: "bg-yellow-500",
    },
    { value: "equity", label: "Equity", icon: Users, color: "bg-green-500" },
    { value: "debt", label: "Debt", icon: DollarSign, color: "bg-purple-500" },
    { value: "art", label: "Fine Art", icon: Building2, color: "bg-pink-500" },
    {
      value: "intellectual-property",
      label: "IP",
      icon: Building2,
      color: "bg-indigo-500",
    },
  ];

  // Show connect wallet prompt if not connected
  if (!address) {
    return (
      <ConnectWalletCard onConnect={connectKeplr} isConnecting={isConnecting} />
    );
  }

  return (
    <div className="p-8 glass-panel rounded-[22px]">
      {/* Multi-Token Architecture Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6] rounded-2xl mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[#CAA141]">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  ERC-3643 Multi-Token Architecture
                </h3>
                <p className="text-sm">
                  Each asset has its own dedicated CW3643 token contract with
                  independent balances and supply. All tokens share the same
                  compliance infrastructure (Identity Registry, Trusted Issuers,
                  Claim Topics).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-semibold">Tokenized Assets</h1>
            <p className="text-gray-600 mt-1">
              Browse and invest in tokenized real-world assets
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={
                viewMode === "grid"
                  ? "bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6]"
                  : ""
              }
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={
                viewMode === "list"
                  ? "bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6]"
                  : ""
              }
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Alert className="mb-4">
          <AlertDescription>
            Investors can browse assets and open details. Token admins manage
            issuance and compliance on the Issuance and Compliance pages.
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Card className="bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[17px] font-semibold">Total Assets</p>
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{stats.totalAssets}</p>
                <p className="text-xs text-gray-500">Tokenized assets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[17px] font-semibold">Total Value</p>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.totalValue)}
                </p>
                <p className="text-xs text-gray-500">Combined value</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[17px] font-semibold">Avg. Tokenization</p>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">
                  {formatPercentage(stats.avgTokenization)}
                </p>
                <p className="text-xs text-gray-500">Of total supply</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[17px] font-semibold">Compliant</p>
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold">
                  {formatPercentage(stats.compliantPercentage)}
                </p>
                <p className="text-xs text-gray-500">Compliance rate</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name, location, or description..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {assetTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="non-compliant">Non-Compliant</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value-desc">Value: High to Low</SelectItem>
              <SelectItem value="value-asc">Value: Low to High</SelectItem>
              <SelectItem value="tokenized-desc">
                Tokenization: High to Low
              </SelectItem>
              <SelectItem value="tokenized-asc">
                Tokenization: Low to High
              </SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="w-fit grid grid-cols-4 p-1 bg-[#F1F2F4] rounded-xl h-auto">
          <TabsTrigger
            value="all"
            className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
          >
            All Assets
          </TabsTrigger>
          <TabsTrigger
            value="featured"
            className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
          >
            Featured
          </TabsTrigger>
          <TabsTrigger
            value="compliant"
            className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
          >
            Compliant Only
          </TabsTrigger>
          <TabsTrigger
            value="new"
            className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
          >
            New Listings
          </TabsTrigger>
        </TabsList>

        {/* All Assets Tab */}
        <TabsContent value="all" className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No assets found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredAssets.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AssetCard asset={asset} />
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {filteredAssets.map((asset, index) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 10 }}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{asset.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{asset.assetType}</Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {asset.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(asset.underlyingValue)}
                          </p>
                          <p className="text-sm text-muted-foreground">Value</p>
                        </div>

                        <div className="text-right">
                          <p className="font-medium">
                            {(
                              (asset.tokenizedAmount / asset.totalSupply) *
                              100
                            ).toFixed(1)}
                            %
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tokenized
                          </p>
                        </div>

                        <div className="text-right">
                          <Badge
                            variant={
                              asset.complianceStatus === "compliant"
                                ? "success"
                                : asset.complianceStatus === "pending"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {asset.complianceStatus}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(asset.issuanceDate).toLocaleDateString()}
                          </p>
                        </div>

                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {filteredAssets.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredAssets.length} of {assets.length} assets
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                  1
                </Button>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  2
                </Button>
                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Featured Tab */}
        <TabsContent value="featured">
          <Card>
            <CardHeader>
              <CardTitle>Featured Assets</CardTitle>
              <CardDescription>
                Top performing and recently listed assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assets
                    .filter((asset) => asset.complianceStatus === "compliant")
                    .slice(0, 6)
                    .map((asset, index) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <AssetCard asset={asset} />
                      </motion.div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliant Only Tab */}
        <TabsContent value="compliant">
          <Card>
            <CardHeader>
              <CardTitle>Fully Compliant Assets</CardTitle>
              <CardDescription>
                Assets that meet all regulatory requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {assets
                    .filter((asset) => asset.complianceStatus === "compliant")
                    .map((asset, index) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-lg border space-y-3 hover:bg-accent/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-green-500/10">
                              <Building2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <h3 className="font-medium">{asset.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {asset.location} • {asset.assetType}
                              </p>
                            </div>
                          </div>
                          <Badge variant="success">Compliant</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Value
                            </p>
                            <p className="font-medium">
                              {formatCurrency(asset.underlyingValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Tokenized
                            </p>
                            <p className="font-medium">
                              {(
                                (asset.tokenizedAmount / asset.totalSupply) *
                                100
                              ).toFixed(1)}
                              %
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Issuer
                            </p>
                            <p className="font-medium">{asset.issuer}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Listings Tab */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>New Asset Listings</CardTitle>
              <CardDescription>Recently tokenized assets</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assets
                    .sort(
                      (a, b) =>
                        new Date(b.issuanceDate).getTime() -
                        new Date(a.issuanceDate).getTime(),
                    )
                    .slice(0, 6)
                    .map((asset, index) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <AssetCard asset={asset} />
                      </motion.div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Asset Detail Modal (if selected) */}
      {selectedAsset && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedAsset.name}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAsset(null)}
                >
                  ✕
                </Button>
              </div>

              {/* Asset details here */}
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  {selectedAsset.description}
                </p>
                {/* Add more detailed asset information */}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
