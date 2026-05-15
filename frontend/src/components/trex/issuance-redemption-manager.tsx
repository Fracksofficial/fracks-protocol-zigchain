"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/use-wallet";
import { apiFetch } from "@/lib/backend";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { AssetInfo, RedemptionRequest } from "@/lib/trex-client";
import type { TokenInfo, TokenInfoFromFactory } from "@/types/trex-contracts";
import type { PermissionsState } from "@/hooks/use-permissions";

interface IssuanceRedemptionManagerProps {
  tokenContract: string;
  permissions?: PermissionsState;
  onUpdate?: () => void;
}

interface IssuanceRequest {
  id: string;
  tokenContract: string;
  assetId: string;
  recipient: string;
  amount: string;
  status: string;
  txHash?: string | null;
  createdAt?: string;
}

/**
 * Issuance and Redemption Manager
 *
 * Provides two-step workflow for:
 * - Investors requesting redemption of tokens
 * - Issuers approving redemption requests
 * - Issuers issuing new tokens for assets
 */
export function IssuanceRedemptionManager({
  tokenContract,
  permissions,
  onUpdate,
}: IssuanceRedemptionManagerProps) {
  const { trexClient, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [roles, setRoles] = useState<{
    owner: string;
    issuer: string;
    controller: string;
  } | null>(null);
  const [factoryAssetId, setFactoryAssetId] = useState<number | null>(null);
  const [factoryToken, setFactoryToken] = useState<TokenInfoFromFactory | null>(
    null
  );
  const [tokenAssets, setTokenAssets] = useState<AssetInfo[]>([]);
  const [assetContextLoading, setAssetContextLoading] = useState(false);
  const [assetContextError, setAssetContextError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [issuerBalance, setIssuerBalance] = useState<string>("0");
  const [viewerBalance, setViewerBalance] = useState<string>("0");
  const [lastIssuance, setLastIssuance] = useState<{
    requestId: string;
    recipient: string;
    amount: string;
    txHash?: string;
  } | null>(null);
  const [issuanceRequests, setIssuanceRequests] = useState<IssuanceRequest[]>(
    []
  );
  const [issuanceLoading, setIssuanceLoading] = useState(false);
  const [selectedIssuanceRequestId, setSelectedIssuanceRequestId] =
    useState("");

  // Request redemption form
  const [assetId, setAssetId] = useState("1");  
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  // Issue asset form
  const [issueAssetId, setIssueAssetId] = useState("1");
  const [issueRecipient, setIssueRecipient] = useState("");
  const [issueAmount, setIssueAmount] = useState("");

  useEffect(() => {
    loadData();
    loadAssetContext();
    loadIssuanceRequests();
  }, [trexClient, tokenContract]);

  useEffect(() => {
    if (!trexClient || !tokenContract) {
      setTokenInfo(null);
      setIssuerBalance("0");
      setViewerBalance("0");
      return;
    }

    const loadBalances = async () => {
      try {
        const info = await trexClient.getTokenInfoForContract(tokenContract);
        setTokenInfo(info);

        if (roles?.issuer) {
          const issuerBal = await trexClient.getBalanceForToken(
            tokenContract,
            roles.issuer
          );
          setIssuerBalance(issuerBal);
        } else {
          setIssuerBalance("0");
        }

        if (address) {
          const viewerBal = await trexClient.getBalanceForToken(
            tokenContract,
            address
          );
          setViewerBalance(viewerBal);
        } else {
          setViewerBalance("0");
        }
      } catch (error) {
        console.error("Failed to load token balances:", error);
      }
    };

    loadBalances();
  }, [trexClient, tokenContract, roles?.issuer, address]);

  const loadData = async () => {
    if (!trexClient || !tokenContract) return;

    try {
      setLoading(true);

      // Load redemption requests
      const reqs = await trexClient.getRedemptionRequests(
        undefined,
        undefined,
        tokenContract
      );
      setRequests(reqs);

      // Load roles to check permissions
      const rolesData = await trexClient.getRoles(tokenContract);
      setRoles(rolesData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const loadAssetContext = async () => {
    if (!trexClient || !tokenContract) return;

    try {
      setAssetContextLoading(true);
      setAssetContextError(null);

      const rawFactoryId = await trexClient
        .getAssetIdByContract(tokenContract)
        .catch(() => null);
      const factoryId =
        rawFactoryId &&
        typeof rawFactoryId === "object" &&
        "asset_id" in rawFactoryId
          ? Number((rawFactoryId as { asset_id: number }).asset_id)
          : rawFactoryId;
      setFactoryAssetId(factoryId);

      let token: TokenInfoFromFactory | null = null;
      if (factoryId) {
        token = await trexClient.getTokenByAssetId(factoryId).catch(() => null);
        setFactoryToken(token);
      } else {
        setFactoryToken(null);
      }

      const assets = await trexClient
        .getAllAssets(undefined, 25, tokenContract)
        .catch(() => []);
      setTokenAssets(assets);

      if (assets.length > 0) {
        const match = token
          ? assets.find((asset) => asset.referenceId === token.reference_id)
          : undefined;
        const selected = match || assets[0];
        setAssetId(selected.id.toString());
        setIssueAssetId(selected.id.toString());
      } else if (factoryId) {
        setAssetContextError(
          "This token contract has no asset entry yet. Create one before issuing."
        );
      }
    } catch (error) {
      console.error("Failed to load asset context:", error);
      setAssetContextError("Failed to load asset details for this token.");
    } finally {
      setAssetContextLoading(false);
    }
  };

  const loadIssuanceRequests = async () => {
    if (!tokenContract) return;

    try {
      setIssuanceLoading(true);
      const requests = await apiFetch<IssuanceRequest[]>(
        `/issuance-requests?tokenContract=${encodeURIComponent(tokenContract)}`
      );
      setIssuanceRequests(requests);
    } catch (error) {
      console.error("Failed to load issuance requests:", error);
    } finally {
      setIssuanceLoading(false);
    }
  };

  const parseFactoryMetadata = (metadata?: string | null) => {
    if (!metadata) return {};
    try {
      return JSON.parse(metadata) as Record<string, any>;
    } catch {
      return {};
    }
  };

  const handleCreateTokenAsset = async () => {
    if (!trexClient || !tokenContract || !factoryToken) return;

    try {
      setLoading(true);
      toast.loading("Creating token asset entry...");

      const metadata = parseFactoryMetadata(factoryToken.metadata);
      const assetData = {
        referenceId: factoryToken.reference_id,
        description: factoryToken.description,
        legalOwner: factoryToken.legal_owner,
        name: metadata.name || factoryToken.name,
        type: metadata.type || "real-estate",
        location: metadata.location || "unknown",
        underlyingValue: metadata.underlyingValue || 0,
        currency: metadata.currency || "USD",
      };

      const result = await trexClient.createAsset(assetData, tokenContract);

      toast.dismiss();
      toast.success("Token asset created", {
        description: `Asset ID ${result.assetId} - Tx: ${result.txHash.substring(
          0,
          8
        )}...`,
      });

      setAssetId(result.assetId.toString());
      setIssueAssetId(result.assetId.toString());
      await loadAssetContext();
      onUpdate?.();
    } catch (error: any) {
      toast.dismiss();
      console.error("Create asset failed:", error);
      toast.error("Create asset failed", {
        description: error.message || "Unable to create token asset",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRedemption = async () => {
    if (!trexClient || !tokenContract || !amount) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Submitting redemption request...");

      const txHash = await trexClient.requestRedemption(
        parseInt(assetId),
        amount,
        reason || undefined,
        tokenContract
      );

      toast.dismiss();
      toast.success(`Redemption request submitted`, {
        description: `Request #${
          txHash.requestId
        } - Tx: ${txHash.txHash.substring(0, 8)}...`,
      });

      // Reset form
      setAmount("");
      setReason("");

      // Reload data
      await loadData();
      onUpdate?.();
    } catch (error: any) {
      toast.dismiss();
      console.error("Request redemption failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error("Unauthorized", {
          description: "Only token holders can request redemption",
        });
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient balance", {
          description: "You do not have enough tokens to redeem",
        });
      } else {
        toast.error("Request failed", {
          description: error.message || "Unknown error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRedemption = async (requestId: number) => {
    if (!trexClient || !tokenContract) return;

    try {
      setLoading(true);
      toast.loading("Approving redemption...");

      const txHash = await trexClient.approveRedemption(
        requestId,
        tokenContract
      );

      toast.dismiss();
      toast.success(`Redemption approved`, {
        description: `Request #${requestId} processed. Tx: ${txHash.substring(
          0,
          8
        )}...`,
      });

      await loadData();
      onUpdate?.();
    } catch (error: any) {
      toast.dismiss();
      console.error("Approve redemption failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error("Unauthorized", {
          description: "Only the issuer can approve redemptions",
        });
      } else {
        toast.error("Approval failed", {
          description: error.message || "Unknown error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAsset = async () => {
    if (!tokenContract || !issueRecipient || !issueAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!issueRecipient.startsWith("zig1")) {
      toast.error("Invalid recipient address", {
        description: "Address must start with zig1",
      });
      return;
    }

    try {
      setLoading(true);
      toast.loading("Submitting issuance request...");

      const request = await apiFetch<IssuanceRequest>("/issuance-requests", {
        method: "POST",
        body: JSON.stringify({
          tokenContract,
          assetId: issueAssetId,
          recipient: issueRecipient,
          amount: issueAmount,
        }),
      });

      toast.dismiss();
      toast.success("Issuance request submitted", {
        description: `Request #${request.id} for ${issueAmount} tokens`,
      });

      setLastIssuance({
        requestId: request.id,
        recipient: issueRecipient,
        amount: issueAmount,
      });

      await loadIssuanceRequests();
      onUpdate?.();
    } catch (error: any) {
      toast.dismiss();
      console.error("Issuance request failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error("Unauthorized", {
          description: "Only the issuer can request issuance",
        });
      } else {
        toast.error("Issuance request failed", {
          description: error.message || "Unknown error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveIssuance = async (requestId: string) => {
    try {
      setLoading(true);
      await apiFetch(`/issuance-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED", txHash: "offchain" }),
      });
      toast.success("Issuance request approved");
      await loadIssuanceRequests();
    } catch (error: any) {
      console.error("Approve issuance failed:", error);
      toast.error("Failed to approve issuance", {
        description: error.message || "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectIssuance = async (requestId: string) => {
    try {
      setLoading(true);
      await apiFetch(`/issuance-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", txHash: "offchain" }),
      });
      toast.success("Issuance request rejected");
      await loadIssuanceRequests();
    } catch (error: any) {
      console.error("Reject issuance failed:", error);
      toast.error("Failed to reject issuance", {
        description: error.message || "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMintApproved = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!selectedApprovedRequest) {
      toast.error("No approved issuance request selected");
      return;
    }

    if (!amountMatchesApproval) {
      toast.error("Issuance amount mismatch", {
        description: `You are only allowed to issue ${approvedAmount} tokens.`,
      });
      return;
    }

    try {
      setLoading(true);
      toast.loading("Issuing approved tokens...");

      const txHash = await trexClient.mint(
        issueRecipient,
        issueAmount,
        tokenContract
      );

      await apiFetch(`/issuance-requests/${selectedApprovedRequest.id}/mint`, {
        method: "PATCH",
        body: JSON.stringify({ txHash }),
      });

      toast.dismiss();
      toast.success("Tokens issued", {
        description: `Issued ${issueAmount} tokens to ${issueRecipient.substring(
          0,
          12
        )}...`,
      });

      setIssueRecipient("");
      setIssueAmount("");
      setSelectedIssuanceRequestId("");
      await loadIssuanceRequests();
      await loadAssetContext();
      onUpdate?.();
    } catch (error: any) {
      toast.dismiss();
      console.error("Issue approved tokens failed:", error);
      toast.error("Issuance failed", {
        description: error.message || "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const isIssuer =
    permissions?.isTokenIssuer ??
    (roles && address && roles.issuer.toLowerCase() === address.toLowerCase());
  const isOwner =
    permissions?.isTokenOwner ??
    (roles && address && roles.owner.toLowerCase() === address.toLowerCase());
  const isController =
    permissions?.isTokenController ??
    (roles &&
      address &&
      roles.controller.toLowerCase() === address.toLowerCase());
  const canApprove = !!isController;

  const pendingRequests = requests.filter((r) => !r.approved);
  const approvedRequests = requests.filter((r) => r.approved);
  const pendingIssuanceRequests = useMemo(
    () => issuanceRequests.filter((req) => req.status === "PENDING"),
    [issuanceRequests]
  );
  const approvedIssuanceRequests = useMemo(
    () => issuanceRequests.filter((req) => req.status === "APPROVED"),
    [issuanceRequests]
  );
  const totalSupply = useMemo(() => tokenInfo?.total_supply || "0", [tokenInfo]);

  const selectedApprovedRequest = useMemo(() => {
    if (!approvedIssuanceRequests.length) return null;

    if (selectedIssuanceRequestId) {
      return (
        approvedIssuanceRequests.find(
          (req) => req.id === selectedIssuanceRequestId
        ) || null
      );
    }

    if (!issueRecipient) return null;
    const normalizedRecipient = issueRecipient.toLowerCase();
    return (
      approvedIssuanceRequests.find(
        (req) =>
          req.assetId === issueAssetId &&
          req.recipient.toLowerCase() === normalizedRecipient
      ) || null
    );
  }, [
    approvedIssuanceRequests,
    selectedIssuanceRequestId,
    issueRecipient,
    issueAssetId,
  ]);

  const approvedAmount =
    selectedApprovedRequest?.amount && selectedApprovedRequest.amount !== ""
      ? selectedApprovedRequest.amount
      : null;

  const amountMatchesApproval =
    approvedAmount && issueAmount ? approvedAmount === issueAmount : false;
  const hasApprovedSelection = !!selectedApprovedRequest;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ArrowDownCircle className="h-6 w-6 text-orange-500" />
            Issuance & Redemption
          </CardTitle>
          <CardDescription>
            Two-step workflow for issuing new tokens and redeeming existing
            tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="redemption" className="w-full">
            <TabsList className="w-fit grid grid-cols-3 p-1 bg-[#F1F2F4] rounded-xl h-auto">
              <TabsTrigger
                value="redemption"
                className="rounded-lg data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
              >
                Request Redemption
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="rounded-lg data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
              >
                Pending Requests{" "}
                {pendingRequests.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-white/20 text-current hover:bg-white/30"
                  >
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="issue"
                className="rounded-lg data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
              >
                Issue Tokens
              </TabsTrigger>
            </TabsList>

            {/* Request Redemption Tab */}
            <TabsContent value="redemption" className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Submit a redemption request to convert your tokens back to the
                  underlying asset. The issuer must approve your request before
                  tokens are burned.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assetId">Token Asset ID</Label>
                  {tokenAssets.length > 0 ? (
                    <Select
                      value={assetId}
                      onValueChange={setAssetId}
                      disabled={loading}
                    >
                      <SelectTrigger id="assetId" className="h-11">
                        <SelectValue placeholder="Select token asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokenAssets.map((asset) => (
                          <SelectItem
                            key={asset.id}
                            value={asset.id.toString()}
                          >
                            {asset.id} - {asset.referenceId || "Asset"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="assetId"
                      type="number"
                      value={assetId}
                      onChange={(e) => setAssetId(e.target.value)}
                      placeholder="1"
                      disabled={loading}
                      className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                    />
                  )}
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1000000"
                      disabled={loading}
                      className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you need to redeem tokens..."
                    disabled={loading}
                    rows={3}
                    className="bg-gray-50 border-gray-200 focus:bg-white transition-colors resize-none"
                  />
                </div>

                <Button
                  onClick={handleRequestRedemption}
                  disabled={loading || !amount}
                  className="w-full bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="mr-2 h-4 w-4" />
                      Request Redemption
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Pending Requests Tab */}
            <TabsContent value="pending" className="space-y-4">
              {!canApprove && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Only the controller can approve redemption requests.
                  </AlertDescription>
                </Alert>
              )}

              {pendingRequests.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    No pending redemption requests at this time.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Asset ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono">
                            #{request.id}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {request.requester.substring(0, 12)}...
                          </TableCell>
                          <TableCell>{request.assetId}</TableCell>
                          <TableCell className="font-mono">
                            {request.amount}
                          </TableCell>
                          <TableCell className="max-w-50 truncate">
                            {request.reason || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {canApprove && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" disabled={loading}>
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Approve
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Approve Redemption Request
                                    </DialogTitle>
                                    <DialogDescription>
                                      This will burn {request.amount} tokens
                                      from {request.requester}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-2 py-4">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <span className="text-muted-foreground">
                                        Request ID:
                                      </span>
                                      <span className="font-mono">
                                        #{request.id}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Asset ID:
                                      </span>
                                      <span>{request.assetId}</span>
                                      <span className="text-muted-foreground">
                                        Amount:
                                      </span>
                                      <span className="font-mono">
                                        {request.amount}
                                      </span>
                                      {request.reason && (
                                        <>
                                          <span className="text-muted-foreground">
                                            Reason:
                                          </span>
                                          <span className="col-span-1">
                                            {request.reason}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <Alert
                                      variant="destructive"
                                      className="mt-4"
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertDescription>
                                        This action will permanently burn
                                        tokens. Make sure you've verified the
                                        underlying asset transfer before
                                        approving.
                                      </AlertDescription>
                                    </Alert>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={() =>
                                        handleApproveRedemption(request.id)
                                      }
                                      disabled={loading}
                                    >
                                      {loading ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Approve Redemption
                                        </>
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {approvedRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Recently Approved</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Requester</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedRequests.slice(0, 5).map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono">
                              #{request.id}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {request.requester.substring(0, 12)}...
                            </TableCell>
                            <TableCell className="font-mono">
                              {request.amount}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Approved
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Issue Tokens Tab */}
            <TabsContent value="issue" className="space-y-4">
              {!isIssuer && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Only the issuer can issue new tokens. Current issuer:{" "}
                    {roles?.issuer.substring(0, 300)}...
                  </AlertDescription>
                </Alert>
              )}

              {assetContextError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{assetContextError}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <ArrowUpCircle className="h-4 w-4" />
                <AlertDescription>
                  Request issuance to mint new tokens. The controller must
                  approve the request before tokens are minted on-chain.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm">
                    <div className="text-slate-500">Total minted supply</div>
                    <div className="font-semibold">{totalSupply}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm">
                    <div className="text-slate-500">Issuer wallet balance</div>
                    <div className="font-semibold">{issuerBalance}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm">
                    <div className="text-slate-500">Your wallet balance</div>
                    <div className="font-semibold">{viewerBalance}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Token Contract</span>
                    <span className="font-mono text-xs">
                      {tokenContract.substring(0, 18)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Factory Asset ID</span>
                    <span>{factoryAssetId ?? "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Token Asset Count</span>
                    <span>
                      {assetContextLoading ? "Loading..." : tokenAssets.length}
                    </span>
                  </div>
                  {tokenAssets.length > 0 && (
                    <div className="flex items-start justify-between gap-3 text-xs text-slate-500">
                      <span className="shrink-0">Token Asset IDs</span>
                      <span className="text-right">
                        {tokenAssets.map((asset) => asset.id).join(", ")}
                      </span>
                    </div>
                  )}
                  {tokenAssets.length === 0 && isOwner && factoryToken && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateTokenAsset}
                      disabled={loading || assetContextLoading}
                    >
                      Create token asset entry
                    </Button>
                  )}
                  {tokenAssets.length === 0 && !isOwner && (
                    <div className="text-xs text-slate-500">
                      Token owner must create the token asset entry before
                      issuance can start.
                    </div>
                  )}
                </div>

                {approvedIssuanceRequests.length > 0 && (
                  <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm space-y-3">
                    <div className="font-semibold text-slate-700">
                      Approved issuance requests
                    </div>
                    <Select
                      value={selectedIssuanceRequestId}
                      onValueChange={(value) => {
                        setSelectedIssuanceRequestId(value);
                        const selected = approvedIssuanceRequests.find(
                          (request) => request.id === value
                        );
                        if (selected) {
                          setIssueAssetId(selected.assetId);
                          setIssueRecipient(selected.recipient);
                          setIssueAmount(selected.amount);
                        }
                      }}
                      disabled={loading || !isIssuer}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select approved request" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedIssuanceRequests.map((request) => (
                          <SelectItem key={request.id} value={request.id}>
                            {request.assetId} • {request.amount} •{" "}
                            {request.recipient.substring(0, 10)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-slate-500">
                      Select an approved request to auto-fill the recipient and
                      amount.
                    </div>
                  </div>
                )}

                {isIssuer && approvedIssuanceRequests.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      No approved issuance requests yet. Submit a request below
                      and wait for controller approval.
                    </AlertDescription>
                  </Alert>
                )}

                {isController && (
                  <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm space-y-3">
                    <div className="font-semibold text-slate-700">
                      Pending issuance approvals
                    </div>
                    {pendingIssuanceRequests.length === 0 ? (
                      <div className="text-xs text-slate-500">
                        No pending issuance approvals.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingIssuanceRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-700">
                                Asset {request.assetId} • {request.amount}
                              </div>
                              <div className="text-slate-500">
                                {request.recipient.substring(0, 16)}...
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleApproveIssuance(request.id)
                                }
                                disabled={loading || issuanceLoading}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleRejectIssuance(request.id)
                                }
                                disabled={loading || issuanceLoading}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {lastIssuance && (
                  <Alert>
                    <AlertDescription>
                      Last issuance request: #{lastIssuance.requestId} for{" "}
                      {lastIssuance.amount} tokens to{" "}
                      {lastIssuance.recipient.substring(0, 12)}... (pending
                      controller approval).
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="issueAssetId">Token Asset ID</Label>
                  {tokenAssets.length > 0 ? (
                    <Select
                      value={issueAssetId}
                      onValueChange={setIssueAssetId}
                      disabled={loading || !isIssuer}
                    >
                      <SelectTrigger id="issueAssetId" className="h-11">
                        <SelectValue placeholder="Select token asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokenAssets.map((asset) => (
                          <SelectItem
                            key={asset.id}
                            value={asset.id.toString()}
                          >
                            {asset.id} - {asset.referenceId || "Asset"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="issueAssetId"
                      type="number"
                      value={issueAssetId}
                      onChange={(e) => setIssueAssetId(e.target.value)}
                      placeholder="1"
                      disabled={loading || !isIssuer}
                      className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueRecipient">Recipient Address</Label>
                  <Input
                    id="issueRecipient"
                    value={issueRecipient}
                    onChange={(e) => setIssueRecipient(e.target.value)}
                    placeholder="zig1..."
                    disabled={loading || !isIssuer || hasApprovedSelection}
                    className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueAmount">Amount</Label>
                  <Input
                    id="issueAmount"
                    type="number"
                    value={issueAmount}
                    onChange={(e) => setIssueAmount(e.target.value)}
                    placeholder="1000000"
                    disabled={loading || !isIssuer || hasApprovedSelection}
                    className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                  />
                  {approvedAmount && (
                    <div className="text-xs text-slate-500">
                      Approved amount: {approvedAmount}
                    </div>
                  )}
                  {selectedApprovedRequest && issueAmount && !amountMatchesApproval && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You are only allowed to issue {approvedAmount} tokens.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button
                  onClick={handleIssueAsset}
                  disabled={
                    loading ||
                    !isIssuer ||
                    !issueRecipient ||
                    !issueAmount
                  }
                  className="w-full bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Request Approval
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleMintApproved}
                  disabled={
                    loading ||
                    !isIssuer ||
                    !selectedApprovedRequest ||
                    !issueRecipient ||
                    !issueAmount ||
                    !amountMatchesApproval
                  }
                  className="w-full bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Issue Tokens
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
