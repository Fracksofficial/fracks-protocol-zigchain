"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  Settings,
  FileText,
  Users,
} from "lucide-react";
import {
  listKycApplications,
  type KycApplication,
} from "@/lib/kyc-api";
import { InvestorClaimsManager } from "@/components/trex/investor-claims-manager";
import { RequiredTopicsManager } from "@/components/trex/required-topics-manager";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";

export default function AdminIdentitiesPage() {
  const { address, trexClient, connectKeplr, isConnected } = useWallet();
  const { permissions, loading: permissionsLoading } = usePermissions({
    trexClient,
    walletAddress: address,
  });
  const [approvedApplications, setApprovedApplications] = useState<
    KycApplication[]
  >([]);
  const [whitelistedWallets, setWhitelistedWallets] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("approvals");
  const loadRunId = useRef(0);

  const runWithConcurrency = async <T,>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>
  ) => {
    let index = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    });
    await Promise.all(runners);
  };

  // Load approved applications that need whitelisting
  const loadApprovedApplications = async () => {
    const runId = ++loadRunId.current;
    setLoading(true);
    setError(null);

    try {
      // Get approved applications from backend
      const apps = await listKycApplications({ status: "APPROVED", limit: 200 });
      const filtered = apps.filter((app) => !!app.onchainIdAddress);
      setApprovedApplications(filtered);

      // Check which are already whitelisted on-chain
      if (trexClient && apps.length > 0) {
        const whitelisted = new Set<string>();
        await runWithConcurrency(apps, 5, async (app) => {
          try {
            const identity = await trexClient.getIdentity(app.walletAddress);
            if (identity.identity_addr) {
              whitelisted.add(app.walletAddress.toLowerCase());
            }
          } catch {
            // Not whitelisted yet
          }
        });
        if (runId === loadRunId.current) {
          setWhitelistedWallets(whitelisted);
        }
      }
    } catch (err: any) {
      console.error("Failed to load applications:", err);
      setError(err.message);
      toast.error("Failed to load applications");
    } finally {
      if (runId === loadRunId.current) {
        setLoading(false);
      }
    }
  };

  // Whitelist investor (register in Identity Registry)
  const whitelistInvestor = async (app: KycApplication) => {
    if (!trexClient || !app.onchainIdAddress) return;

    const loadingToast = toast.loading(
      `Registering ${app.fullName} in Identity Registry...`
    );

    try {
      const txHash = await trexClient.registerIdentity(
        app.walletAddress,
        app.onchainIdAddress,
        app.country
      );

      toast.success(`Investor whitelisted! TX: ${txHash.slice(0, 10)}...`, {
        id: loadingToast,
      });

      // Update local state
      setWhitelistedWallets((prev) =>
        new Set(prev).add(app.walletAddress.toLowerCase())
      );

      // Reload list
      await loadApprovedApplications();
    } catch (err: any) {
      toast.error(`Failed to whitelist: ${err.message}`, { id: loadingToast });
    }
  };

  const canWhitelist = permissions.isIdentityRegistryOwner;
  const canManageTopics = permissions.isClaimTopicsOwner;
  const canManageClaims = permissions.isTrustedIssuer;
  const availableTabs = [
    { value: "approvals", label: "Whitelist Approvals", visible: canWhitelist },
    { value: "settings", label: "Compliance Settings", visible: canManageTopics },
    { value: "claims", label: "Manage Claims", visible: canManageClaims },
  ].filter((tab) => tab.visible);

  useEffect(() => {
    loadApprovedApplications();
  }, [trexClient]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.value === activeTab)) {
      setActiveTab(availableTabs[0].value);
    }
  }, [availableTabs, activeTab]);

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">
            Admin: Identity Management
          </h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to manage investor verifications
          </p>
          <Button onClick={connectKeplr} size="lg">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  if (!permissionsLoading && availableTabs.length === 0) {
    return (
      <div className="p-8 glass-panel rounded-[22px]">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            Your wallet does not have permissions to manage identity settings.
            Connect an Identity Registry owner or trusted issuer wallet.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 glass-panel rounded-[22px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-linear-to-tr from-[#172E7F] to-[#2A5FA6]">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Identity Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage investor verifications and compliance settings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadApprovedApplications}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          Identity Registry owner can whitelist wallets. Claim Topics owner can
          update required topics. Trusted issuers can add claims for authorized
          topics.
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
        <Card className="bg-white rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[17px] font-semibold">Total Applications</p>
                <p className="text-3xl font-bold mt-1">
                  {approvedApplications.length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[17px] font-semibold">Whitelisted</p>
                <p className="text-3xl font-bold mt-1 text-green-600">
                  {whitelistedWallets.size}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[17px] font-semibold">Pending Whitelist</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">
                  {approvedApplications.length - whitelistedWallets.size}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabbed Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-3"
      >
        <TabsList
          className={`w-fit grid p-1 bg-[#F1F2F4] rounded-xl h-auto ${
            availableTabs.length === 1
              ? "grid-cols-1"
              : availableTabs.length === 2
              ? "grid-cols-2"
              : "grid-cols-3"
          }`}
        >
          {canWhitelist && (
            <TabsTrigger
              value="approvals"
              className="gap-2 rounded-lg data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
            >
              <UserCheck className="h-4 w-4" />
              <span>Whitelist Approvals</span>
              {approvedApplications.length - whitelistedWallets.size > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs bg-white/20 text-current hover:bg-white/30 border-0">
                  {approvedApplications.length - whitelistedWallets.size}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {canManageTopics && (
            <TabsTrigger
              value="settings"
              className="gap-2 rounded-lg data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
            >
              <Settings className="h-4 w-4" />
              <span>Compliance Settings</span>
            </TabsTrigger>
          )}
          {canManageClaims && (
            <TabsTrigger
              value="claims"
              className="gap-2 rounded-lg data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Manage Claims</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Whitelist Approvals */}
        {canWhitelist && (
          <TabsContent value="approvals" className="space-y-4">
          {/* Quick Guide */}
          <Alert className="border-blue-200">
            <UserPlus className="h-4 w-4 text-blue-600" />
            <AlertTitle className="">Whitelisting Workflow</AlertTitle>
            <AlertDescription className="">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                <div className="flex gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold">Investor Applies</p>
                    <p className="text-blue-700">Submit KYC at /identity</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold">KYC Approval</p>
                    <p className="text-blue-700">Provider creates OnchainID</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold">You Whitelist</p>
                    <p className="text-blue-700">
                      Register in Identity Registry
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold">Trading Enabled</p>
                    <p className="text-blue-700">
                      Full platform access granted
                    </p>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Approved Investors</CardTitle>
                  <CardDescription>
                    Register approved investors in the Identity Registry to
                    enable token trading
                  </CardDescription>
                </div>
                {approvedApplications.length - whitelistedWallets.size > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 border-yellow-300"
                  >
                    {approvedApplications.length - whitelistedWallets.size}{" "}
                    Pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-muted-foreground font-medium">
                    Loading applications...
                  </p>
                </div>
              ) : approvedApplications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                    <UserCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">
                    No approved applications
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Approved investors will appear here after the KYC provider
                    creates their OnchainID
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">
                          Investor
                        </TableHead>
                        <TableHead className="font-semibold">
                          Wallet Address
                        </TableHead>
                        <TableHead className="font-semibold">Country</TableHead>
                        <TableHead className="font-semibold">
                          OnchainID
                        </TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedApplications.map((app) => {
                        const isWhitelisted = whitelistedWallets.has(
                          app.walletAddress.toLowerCase()
                        );
                        return (
                          <TableRow key={app.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-medium">{app.fullName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {app.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {app.walletAddress.slice(0, 16)}...
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{app.country}</Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {app.onchainIdAddress?.slice(0, 16)}...
                              </code>
                            </TableCell>
                            <TableCell>
                              {isWhitelisted ? (
                                <Badge className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Whitelisted
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isWhitelisted ? (
                                <Button
                                  size="sm"
                                  onClick={() => whitelistInvestor(app)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Whitelist
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" disabled>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Registered
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}

        {/* Tab 2: Compliance Settings (Required Topics) */}
        {canManageTopics && (
          <TabsContent value="settings" className="mt-6">
            <RequiredTopicsManager onUpdate={loadApprovedApplications} />
          </TabsContent>
        )}

        {/* Tab 3: Manage Claims */}
        {canManageClaims && (
          <TabsContent value="claims" className="mt-6">
            <InvestorClaimsManager onUpdate={loadApprovedApplications} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
