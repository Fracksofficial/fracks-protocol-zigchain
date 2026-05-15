/**
 * Investor Claims Manager Component
 * Allows admins/issuers to add claims to any investor's OnchainID
 */

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { UserIdentity } from "@/types/trex-contracts";

// Topic definitions - Standard T-REX topic mappings (YOU can customize these!)
// Topics are just numbers (u32) - the names are purely for UI display
// Your smart contracts use ANY topic number you want (1-4294967295)
const CLAIM_TOPICS = [
  { id: 1, name: "KYC", description: "Know Your Customer verification" },
  { id: 2, name: "AML", description: "Anti-Money Laundering check" },
  {
    id: 3,
    name: "Accredited Investor",
    description: "SEC accredited investor status",
  },
  {
    id: 4,
    name: "Qualified Purchaser",
    description: "Qualified purchaser status",
  },
  { id: 5, name: "Institutional", description: "Institutional investor" },
  { id: 6, name: "Retail", description: "Retail investor" },
  { id: 7, name: "Sanctions Check", description: "Sanctions screening passed" },
  { id: 8, name: "Tax Status", description: "Tax documentation verified" },
  { id: 9, name: "Credit Check", description: "Credit verification" },
  { id: 10, name: "Custom", description: "Custom claim type" },
  // You can add more topics here! Just add: { id: 11, name: 'Your Topic', description: '...' }
];

interface InvestorClaimsManagerProps {
  onUpdate?: () => void;
}

export function InvestorClaimsManager({
  onUpdate,
}: InvestorClaimsManagerProps) {
  const { trexClient } = useWallet();
  const [walletAddress, setWalletAddress] = useState("");
  const [investorIdentity, setInvestorIdentity] = useState<UserIdentity | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [issuerTopics, setIssuerTopics] = useState<number[]>([]);

  // Load issuer's authorized topics
  useEffect(() => {
    const loadIssuerTopics = async () => {
      if (!trexClient) return;

      // Get wallet address - trexClient has walletAddress property
      const walletAddr = (trexClient as any).walletAddress;
      if (!walletAddr) return;

      try {
        const topics = await trexClient.getIssuerTopics(walletAddr);
        setIssuerTopics(topics || []);
      } catch (error) {
        console.error("Failed to load issuer topics:", error);
      }
    };
    loadIssuerTopics();
  }, [trexClient]);

  // Search for investor by wallet address
  const handleSearch = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!walletAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    // Validate zigchain address format
    if (!walletAddress.startsWith("zig1")) {
      toast.error('Invalid ZigChain address. Should start with "zig1"');
      return;
    }

    setLoading(true);

    try {
      const identity = await trexClient.getUserIdentity(walletAddress);

      if (!identity.onchainIdAddress) {
        toast.error("This investor does not have an OnchainID yet", {
          description: "They need to go through KYC approval first",
        });
        setInvestorIdentity(null);
        return;
      }

      setInvestorIdentity(identity);
      toast.success("Investor found!", {
        description: `OnchainID: ${identity.onchainIdAddress.slice(0, 20)}...`,
      });
    } catch (error: any) {
      console.error("Search failed:", error);
      toast.error("Failed to find investor", {
        description: error.message,
      });
      setInvestorIdentity(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new claim
  const handleAddClaim = async (
    topic: number,
    data: string,
    expiresInDays: number
  ) => {
    if (!trexClient || !investorIdentity?.onchainIdAddress) return;

    const loadingToast = toast.loading("Adding claim to investor...");

    try {
      // Calculate expiration
      const expiresAt =
        Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;

      const txHash = await trexClient.addClaim(
        investorIdentity.onchainIdAddress,
        topic,
        data,
        expiresAt
      );

      toast.success("Claim added successfully!", {
        id: loadingToast,
        description: `TX: ${txHash.slice(0, 16)}...`,
      });

      // Refresh identity
      const updatedIdentity = await trexClient.getUserIdentity(walletAddress);
      setInvestorIdentity(updatedIdentity);

      onUpdate?.();
    } catch (error: any) {
      console.error("Add claim failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error("Authorization Failed", {
          id: loadingToast,
          description:
            "You must be a Trusted Issuer for this topic, or the OnchainID owner",
        });
      } else {
        toast.error("Failed to add claim", {
          id: loadingToast,
          description: error.message,
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Manage Investor Claims
        </CardTitle>
        <CardDescription>
          Add additional claims (accredited investor, sanctions check, etc.) to
          existing investors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="investor-wallet">Investor Wallet Address</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="investor-wallet"
                placeholder="zig1..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Search</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the investor's wallet address to view their OnchainID and
              claims
            </p>
          </div>

          {/* Issuer Topics Info */}
          {issuerTopics.length > 0 && (
            <Alert className="rounded-xl border-blue-100 bg-blue-50/50">
              <Shield className="h-4 w-4 text-[#172E7F]" />
              <AlertTitle className="text-[#172E7F]">
                Your Authorized Topics
              </AlertTitle>
              <AlertDescription className="text-xs text-blue-700">
                You can add claims for:{" "}
                {issuerTopics
                  .map((t) => {
                    const topic = CLAIM_TOPICS.find((ct) => ct.id === t);
                    return topic ? `${topic.name} (${t})` : `Topic ${t}`;
                  })
                  .join(", ")}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Investor Identity Display */}
        {investorIdentity && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="font-semibold mb-3">Investor Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">
                    Wallet Address
                  </Label>
                  <p className="font-mono text-xs mt-1">
                    {investorIdentity.wallet}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">OnchainID</Label>
                  <p className="font-mono text-xs mt-1">
                    {investorIdentity.onchainIdAddress}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Country</Label>
                  <p className="mt-1">
                    {investorIdentity.country || "Not specified"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Verification Status
                  </Label>
                  <div className="mt-1">
                    {investorIdentity.isVerified ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Existing Claims */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  Existing Claims ({investorIdentity.claims?.length || 0})
                </h3>
                <AddClaimDialog
                  investorAddress={investorIdentity.wallet}
                  onchainIdAddress={investorIdentity.onchainIdAddress!}
                  issuerTopics={issuerTopics}
                  onSuccess={(topic, data, days) =>
                    handleAddClaim(topic, data, days)
                  }
                />
              </div>

              {investorIdentity.claims && investorIdentity.claims.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Issuer</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investorIdentity.claims.map(
                        (claim: any, idx: number) => {
                          const topic = CLAIM_TOPICS.find(
                            (t) => t.id === claim.topic
                          );
                          const isExpired =
                            claim.expires_at &&
                            claim.expires_at < Math.floor(Date.now() / 1000);
                          const canRevoke = !claim.revoked;

                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {topic?.name || `Topic ${claim.topic}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {topic?.description}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {claim.issuer.slice(0, 12)}...
                              </TableCell>
                              <TableCell className="font-mono text-xs max-w-[200px] truncate">
                                {claim.data}
                              </TableCell>
                              <TableCell>
                                {claim.revoked ? (
                                  <Badge variant="destructive">Revoked</Badge>
                                ) : isExpired ? (
                                  <Badge variant="secondary">Expired</Badge>
                                ) : (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600"
                                  >
                                    Active
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {canRevoke && (
                                  <RevokeClaimDialog
                                    claim={claim}
                                    investorAddress={investorIdentity.wallet}
                                    onchainIdAddress={
                                      investorIdentity.onchainIdAddress!
                                    }
                                    onRevoke={async () => {
                                      const updatedIdentity =
                                        await trexClient!.getUserIdentity(
                                          walletAddress
                                        );
                                      setInvestorIdentity(updatedIdentity);
                                      onUpdate?.();
                                    }}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert className="rounded-xl bg-gray-50 border-gray-100">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <AlertDescription className="text-gray-500 text-xs">
                    No claims found. Add claims using the button above.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {/* No investor selected */}
        {!investorIdentity && !loading && (
          <Alert className="rounded-xl bg-gray-50 border-gray-100">
            <Search className="h-4 w-4 text-gray-400" />
            <AlertDescription className="text-gray-500 text-sm">
              Search for an investor by wallet address to view and manage their
              claims
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Add Claim Dialog
 */
function AddClaimDialog({
  investorAddress,
  onchainIdAddress,
  issuerTopics,
  onSuccess,
}: {
  investorAddress: string;
  onchainIdAddress: string;
  issuerTopics: number[];
  onSuccess: (
    topic: number,
    data: string,
    expiresInDays: number
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [claimData, setClaimData] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("365");
  const [isAdding, setIsAdding] = useState(false);

  const availableTopics = CLAIM_TOPICS.filter((t) =>
    issuerTopics.includes(t.id)
  );

  const handleSubmit = async () => {
    if (!selectedTopic) {
      toast.error("Please select a topic");
      return;
    }

    if (!claimData.trim()) {
      toast.error("Please enter claim data");
      return;
    }

    setIsAdding(true);

    try {
      await onSuccess(
        parseInt(selectedTopic),
        claimData,
        parseInt(expiresInDays)
      );
      setOpen(false);
      setSelectedTopic("");
      setClaimData("");
      setExpiresInDays("365");
    } catch (error) {
      // Error already handled by parent
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Claim to Investor</DialogTitle>
          <DialogDescription>
            Add a new claim to this investor's OnchainID. The claim will be
            issued by your wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-muted-foreground text-xs">
              Investor Wallet
            </Label>
            <p className="font-mono text-xs mt-1">{investorAddress}</p>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">OnchainID</Label>
            <p className="font-mono text-xs mt-1">{onchainIdAddress}</p>
          </div>

          <div>
            <Label htmlFor="topic">Claim Topic *</Label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger id="topic" className="mt-1">
                <SelectValue placeholder="Select a topic..." />
              </SelectTrigger>
              <SelectContent>
                {availableTopics.length > 0 ? (
                  availableTopics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id.toString()}>
                      {topic.name} (Topic {topic.id}) - {topic.description}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    No authorized topics. You must be added as a Trusted Issuer
                    first.
                  </div>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              You can only add claims for topics you're authorized for
            </p>
          </div>

          <div>
            <Label htmlFor="claim-data">Claim Data *</Label>
            <Input
              id="claim-data"
              placeholder="e.g., ACCREDITED_INVESTOR_2025"
              value={claimData}
              onChange={(e) => setClaimData(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Unique identifier or verification code for this claim
            </p>
          </div>

          <div>
            <Label htmlFor="expires">Expires In (days) *</Label>
            <Input
              id="expires"
              type="number"
              min="1"
              max="3650"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Claim will expire after this many days (default: 365)
            </p>
          </div>

          {availableTopics.length === 0 && (
            <Alert
              variant="destructive"
              className="rounded-xl bg-red-50 border-red-100"
            >
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-900">
                No Authorized Topics
              </AlertTitle>
              <AlertDescription className="text-xs text-red-800">
                You must be added as a Trusted Issuer in the TIR contract before
                you can add claims. Contact the contract owner.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAdding || availableTopics.length === 0}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Claim
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Revoke Claim Dialog
 */
function RevokeClaimDialog({
  claim,
  investorAddress,
  onchainIdAddress,
  onRevoke,
}: {
  claim: any;
  investorAddress: string;
  onchainIdAddress: string;
  onRevoke: () => Promise<void>;
}) {
  const { trexClient } = useWallet();
  const [open, setOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const topic = CLAIM_TOPICS.find((t) => t.id === claim.topic);

  const handleRevoke = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsRevoking(true);
    const loadingToast = toast.loading("Revoking claim...");

    try {
      const txHash = await trexClient.revokeClaim(
        onchainIdAddress,
        claim.topic,
        claim.id
      );

      toast.success(
        <div>
          <p className="font-semibold">Claim revoked successfully!</p>
          <p className="text-xs mt-1">
            Topic: {topic?.name || `Topic ${claim.topic}`}
          </p>
          <p className="text-xs">Investor: {investorAddress.slice(0, 20)}...</p>
          <p className="text-xs text-muted-foreground mt-1">
            TX: {txHash.slice(0, 16)}...
          </p>
        </div>,
        { id: loadingToast, duration: 6000 }
      );

      setOpen(false);
      await onRevoke();
    } catch (error: any) {
      console.error("Revoke claim failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error(
          <div>
            <p className="font-semibold">Authorization Failed</p>
            <p className="text-xs mt-1">
              Only the claim issuer or OnchainID owner can revoke claims.
              <br />
              Your wallet may not have the required permissions.
            </p>
          </div>,
          { id: loadingToast, duration: 6000 }
        );
      } else {
        toast.error(error.message || "Failed to revoke claim", {
          id: loadingToast,
        });
      }
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Revoke
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke Claim</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this claim? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription className="text-xs">
              Revoking this claim will immediately affect the investor's
              verification status. They may no longer be able to transfer or
              receive tokens if this is a required claim.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Claim Topic</p>
              <p className="font-medium">
                {topic?.name || `Topic ${claim.topic}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {topic?.description}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Claim ID</p>
              <p className="font-mono text-sm">{claim.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Investor</p>
              <p className="font-mono text-xs">{investorAddress}</p>
            </div>
            {claim.data && (
              <div>
                <p className="text-sm text-muted-foreground">Claim Data</p>
                <p className="font-mono text-xs">{claim.data}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isRevoking}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Revoking...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Revoke Claim
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
