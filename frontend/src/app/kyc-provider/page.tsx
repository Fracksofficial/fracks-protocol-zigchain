"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TokenSelector } from "@/components/rwa/token-selector";
import { BatchKYCOps } from "@/components/trex/batch-kyc-ops";
import {
  Shield,
  UserCheck,
  XCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  listKycApplications,
  approveKycApplication,
  rejectKycApplication,
  type KycApplication,
} from "@/lib/kyc-api";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";

export default function KycProviderPage() {
  const { address, trexClient, connectKeplr, isConnected, isConnecting } =
    useWallet();
  const { permissions, canSeeKycProvider, loading: permissionsLoading } =
    usePermissions({
    trexClient,
    walletAddress: address,
  });
  const [applications, setApplications] = useState<KycApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<KycApplication | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [issuerTopics, setIssuerTopics] = useState<number[]>([]);
  const [selectedTokenContract, setSelectedTokenContract] = useState<string | null>(
    null
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");

  const loadApplications = async () => {
    try {
      const apps = await listKycApplications({ status: "PENDING", limit: 200 });
      setApplications(apps);
    } catch (error: any) {
      console.error("Failed to load KYC applications:", error);
      toast.error("Failed to load applications", {
        description: error.message,
      });
    }
  };

  const handleTokenSelect = (
    contract: string,
    _assetId: string,
    symbol: string
  ) => {
    setSelectedTokenContract(contract);
    setSelectedSymbol(symbol);
  };

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    const loadIssuerTopics = async () => {
      if (!trexClient || !address) {
        setIssuerTopics([]);
        return;
      }

      try {
        const topics = await trexClient.getIssuerTopics(address);
        setIssuerTopics(topics || []);
      } catch (error) {
        console.error("Failed to load issuer topics:", error);
        setIssuerTopics([]);
      }
    };

    loadIssuerTopics();
  }, [trexClient, address]);

  const handleReviewClick = (app: KycApplication) => {
    setSelectedApp(app);
    setReviewDialogOpen(true);
    setRejectionReason("");
  };

  const handleApprove = async () => {
    if (!selectedApp || !trexClient || !address) return;

    if (!issuerTopics.includes(1)) {
      toast.error("Approval blocked: topic 1 not authorized", {
        description:
          "Ask the platform owner to add your wallet to TIR for topic 1 (KYC).",
      });
      return;
    }

    setProcessing(true);
    const loadingToast = toast.loading("Loading investor OnchainID...");

    try {
      const identity = await trexClient.getIdentity(selectedApp.walletAddress);
      let onchainIdAddress = identity.identity_addr;

      // If OnchainID doesn't exist, create it (Admin will register it later)
      if (!onchainIdAddress) {
        toast.loading("Creating new OnchainID contract...", {
          id: loadingToast,
        });

        // 1. Instantiate OnchainID contract
        onchainIdAddress = await trexClient.createOnChainIdForInvestor(
          selectedApp.walletAddress,
          `ID-${selectedApp.walletAddress.slice(0, 8)}`
        );

        toast.success("OnchainID created!", {
          id: loadingToast,
        });
      }

      // const onchainIdAddress = identity.identity_addr; // Removed as we set it above
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      toast.loading("Adding KYC claim (topic 1)...", { id: loadingToast });
      await trexClient.addClaim(
        onchainIdAddress,
        1,
        `KYC_APPROVED_${Date.now()}`,
        expiresAt
      );

      if (permissions.isIdentityRegistryOwner) {
        toast.loading("Registering identity in Identity Registry...", {
          id: loadingToast,
        });
        await trexClient.registerIdentity(
          selectedApp.walletAddress,
          onchainIdAddress,
          selectedApp.country
        );
      } else {
        toast.info("Identity registry registration pending", {
          id: loadingToast,
          description:
            "The registry owner must register this identity before the investor can trade.",
        });
      }

      // Step 5: Update application status
      await approveKycApplication(selectedApp.id, {
        reviewedBy: address,
        onchainIdAddress,
      });

      const successDescription = permissions.isIdentityRegistryOwner
        ? `Investor can now trade security tokens. OnchainID: ${onchainIdAddress.slice(
            0,
            20
          )}...`
        : `OnchainID created: ${onchainIdAddress.slice(
            0,
            20
          )}... Registry owner must register before trading.`;

      toast.success("KYC Approved", {
        id: loadingToast,
        description: successDescription,
      });

      setReviewDialogOpen(false);
      loadApplications();
    } catch (error: any) {
      console.error("Approval error:", error);
      toast.error("Approval Failed", {
        id: loadingToast,
        description: error.message || "Failed to complete approval process",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !address) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      await rejectKycApplication(selectedApp.id, {
        reviewedBy: address,
        rejectionReason,
      });
      toast.success("Application Rejected", {
        description: "Investor has been notified",
      });
      setReviewDialogOpen(false);
      await loadApplications();
    } catch (error: any) {
      toast.error("Rejection Failed", {
        description: error.message,
      });
    }
  };

  if (!isConnected && isConnecting) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">KYC Provider Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Connecting wallet and loading permissions...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Please wait</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">KYC Provider Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to review KYC applications
          </p>
          <Button onClick={connectKeplr} size="lg">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  if (!permissionsLoading && !canSeeKycProvider) {
    return (
      <div className="p-8 glass-panel rounded-[22px]">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            Only trusted issuers authorized for KYC (topic 1) can access this
            dashboard.
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
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KYC Provider Dashboard</h1>
              <p className="text-sm text-gray-600">
                Review and process investor KYC applications
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadApplications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pending Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your review
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              KYC Authority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {issuerTopics.length > 0 ? (
                issuerTopics.map((topic) => (
                  <Badge key={topic} variant="outline">
                    Topic {topic}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">No topics assigned</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Topic 1 is required to approve KYC.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Registry Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={permissions.isIdentityRegistryOwner ? "default" : "secondary"}
              >
                {permissions.isIdentityRegistryOwner ? "Registry Owner" : "Issuer Only"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Only the registry owner can register identities.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">
          Your Role: KYC Provider
        </AlertTitle>
        <AlertDescription className="text-blue-700">
          Review investor applications, create OnChainIDs when needed, and add
          KYC claims (topic 1). If you are the Identity Registry owner, you can
          register identities immediately; otherwise, the registry owner must
          complete registration.
        </AlertDescription>
      </Alert>

      {/* Applications Table */}
      <Card className="bg-white rounded-2xl">
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>
            {applications.length} application
            {applications.length !== 1 ? "s" : ""} awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No pending applications</p>
              <p className="text-xs mt-1">New applications will appear here</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {app.fullName}
                        <div className="text-xs text-muted-foreground font-mono">
                          {app.walletAddress.slice(0, 15)}...
                        </div>
                      </TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{app.country}</Badge>
                      </TableCell>
                      <TableCell>
                        {app.nationality || "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewClick(app)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4">
        <Card className="bg-white rounded-2xl">
          <CardHeader>
            <CardTitle>Batch KYC Context</CardTitle>
            <CardDescription>
              Batch updates are token-specific. Select the asset token you want
              to update before uploading CSVs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TokenSelector
              selectedTokenContract={selectedTokenContract}
              onSelect={handleTokenSelect}
              className="max-w-md"
            />
            {selectedSymbol && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected token: <span className="font-medium">{selectedSymbol}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <BatchKYCOps
          tokenContract={selectedTokenContract || undefined}
          onUpdate={loadApplications}
        />
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review KYC Application</DialogTitle>
            <DialogDescription>
              Verify the information and approve or reject this application
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{selectedApp.fullName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedApp.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Country</Label>
                  <p className="font-medium">{selectedApp.country}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date of Birth</Label>
                  <p className="font-medium">
                    {selectedApp.dateOfBirth
                      ? new Date(selectedApp.dateOfBirth).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nationality</Label>
                  <p className="font-medium">{selectedApp.nationality}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">
                  {selectedApp.addressLine1}
                  {selectedApp.addressLine2 ? `, ${selectedApp.addressLine2}` : ""}
                  {selectedApp.city ? `, ${selectedApp.city}` : ""}
                  {selectedApp.state ? `, ${selectedApp.state}` : ""}
                  {selectedApp.postalCode ? ` ${selectedApp.postalCode}` : ""}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Wallet Address</Label>
                <p className="font-mono text-xs">{selectedApp.walletAddress}</p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Approval process:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-0.5">
                    <li>Create OnchainID contract (if not exists)</li>
                    <li>Add KYC claim (topic 1) to OnchainID</li>
                    <li>Register identity in Identity Registry (owner only)</li>
                    <li>Investor can trade after registration</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {/* Rejection Reason (only show if rejecting) */}
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">
                  Rejection Reason (optional)
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Invalid document, missing information, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {processing ? "Processing..." : "Approve KYC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
