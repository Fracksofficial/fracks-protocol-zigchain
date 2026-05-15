/**
 * Identity Manager Component
 * Create OnChainID, register identity, and manage claims
 */

"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  Plus,
  ShieldCheck,
  MapPin,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/seperator";
import { useWallet } from "@/hooks/use-wallet";
import { usePermissions } from "@/hooks/use-permissions";
import { UserIdentity, CLAIM_TOPIC_NAMES } from "@/types/trex-contracts";
import { TREX_CONTRACTS, getZigChainConfig } from "@/lib/zigchain-config";
import { toast } from "sonner";

interface IdentityManagerProps {
  userIdentity: UserIdentity | null;
  onUpdate?: () => void;
}

export function IdentityManager({
  userIdentity,
  onUpdate,
}: IdentityManagerProps) {
  const { trexClient, address } = useWallet();
  const { permissions } = usePermissions({
    trexClient,
    walletAddress: address,
  });
  const [isCreatingId, setIsCreatingId] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [country, setCountry] = useState("");
  const [issuerTopics, setIssuerTopics] = useState<number[] | null>(null);
  const [lcdOnchainId, setLcdOnchainId] = useState<string | null>(null);
  const [isLoadingLcdId, setIsLoadingLcdId] = useState(false);
  const canCreateOnchainId = !!issuerTopics?.includes(1);
  const canRegisterIdentity = !!permissions.isIdentityRegistryOwner;

  // Check if current wallet is a trusted issuer
  useEffect(() => {
    const checkIssuerStatus = async () => {
      if (trexClient && address) {
        try {
          const topics = await trexClient.getIssuerTopics(address);
          setIssuerTopics(topics);
        } catch (error) {
          console.error("Failed to check issuer status:", error);
        }
      }
    };
    checkIssuerStatus();
  }, [trexClient, address]);

  useEffect(() => {
    let isActive = true;

    const loadIdentityFromLcd = async () => {
      if (!address || userIdentity?.onchainIdAddress) {
        if (isActive) {
          setLcdOnchainId(null);
        }
        return;
      }

      const config = getZigChainConfig();
      if (!config.restEndpoint) {
        return;
      }

      setIsLoadingLcdId(true);

      try {
        const query = {
          identity: {
            wallet: address,
          },
        };
        const queryJson = JSON.stringify(query);
        const base64Query =
          typeof window !== "undefined"
            ? window.btoa(queryJson)
            : Buffer.from(queryJson).toString("base64");
        const endpoint = config.restEndpoint.replace(/\/$/, "");
        const url = `${endpoint}/cosmwasm/wasm/v1/contract/${TREX_CONTRACTS.identityRegistry}/smart/${base64Query}`;
        const response = await fetch(url);
        const json = await response.json();
        const identityAddr =
          json?.data?.identity_addr ||
          json?.identity_addr ||
          json?.data?.identityAddress ||
          null;

        if (isActive) {
          setLcdOnchainId(identityAddr);
        }
      } catch (error) {
        console.error("Failed to load identity from LCD:", error);
        if (isActive) {
          setLcdOnchainId(null);
        }
      } finally {
        if (isActive) {
          setIsLoadingLcdId(false);
        }
      }
    };

    loadIdentityFromLcd();

    return () => {
      isActive = false;
    };
  }, [address, userIdentity?.onchainIdAddress]);

  const onchainIdToDisplay = userIdentity?.onchainIdAddress || lcdOnchainId;

  /**
   * Create OnChainID for the user
   */
  const handleCreateOnChainId = async () => {
    if (!trexClient || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!canCreateOnchainId) {
      toast.error("Only the KYC issuer can create OnChainID");
      return;
    }

    setIsCreatingId(true);

    try {
      const onchainIdAddress = await trexClient.createOnChainId(
        address,
        `OnChainID-${address.slice(0, 10)}`
      );

      toast.success(
        <div>
          <p className="font-semibold">OnChainID created!</p>
          <p className="text-xs mt-1">{onchainIdAddress.slice(0, 20)}...</p>
        </div>
      );

      onUpdate?.();
    } catch (error: any) {
      console.error("Failed to create OnChainID:", error);
      toast.error(error.message || "Failed to create OnChainID");
    } finally {
      setIsCreatingId(false);
    }
  };

  /**
   * Register identity in the registry
   */
  const handleRegisterIdentity = async () => {
    if (!trexClient || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!canRegisterIdentity) {
      toast.error("Only the Identity Registry owner can register identities");
      return;
    }

    if (!userIdentity?.onchainIdAddress) {
      toast.error("Please create OnChainID first");
      return;
    }

    if (!country) {
      toast.error("Please enter your country");
      return;
    }

    setIsRegistering(true);

    try {
      const txHash = await trexClient.registerIdentity(
        address,
        userIdentity.onchainIdAddress,
        country.toUpperCase()
      );

      toast.success(
        <div>
          <p className="font-semibold">Identity registered!</p>
          <p className="text-xs mt-1">TX: {txHash.slice(0, 16)}...</p>
        </div>
      );

      setCountry("");
      onUpdate?.();
    } catch (error: any) {
      console.error("Failed to register identity:", error);
      toast.error(error.message || "Failed to register identity");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Issuer Status Info */}
      {issuerTopics && issuerTopics.length > 0 && (
        <div className="p-4 rounded-lg border border-purple-200 !bg-purple-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900">
                Trusted Issuer Status
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                You can add claims for topics:{" "}
                <strong>
                  {issuerTopics
                    .map((t) => {
                      const names: Record<number, string> = {
                        1: "KYC",
                        2: "AML",
                        3: "Accredited Investor",
                        4: "Residency",
                        5: "Age Verification",
                      };
                      return names[t] || `Topic ${t}`;
                    })
                    .join(", ")}
                </strong>
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Note: You can only add claims if you're the issuer OR the
                OnchainID owner. The claim's "issuer" field will be set to your
                wallet address.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <Card className="bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Identity Status
          </CardTitle>
          <CardDescription>
            Your on-chain identity and verification status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Address */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Wallet Address
            </Label>
            <p className="font-mono text-sm mt-1">
              {address || "Not connected"}
            </p>
          </div>

          <Separator />

          {/* OnChainID Status */}
          <div>
            <Label className="text-xs text-muted-foreground">
              OnChainID Contract
            </Label>
            {onchainIdToDisplay ? (
              <div className="flex items-center gap-2 mt-1">
                <p className="font-mono text-sm flex-1">
                  {onchainIdToDisplay}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://testnet.ping.pub/zigchain/account/${onchainIdToDisplay}`,
                      "_blank"
                    )
                  }
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  Active
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground flex-1">
                  {isLoadingLcdId ? "Loading from registry..." : "No OnChainID found"}
                </p>
                {canCreateOnchainId && (
                  <Button
                    size="sm"
                    onClick={handleCreateOnChainId}
                    disabled={isCreatingId}
                  >
                    {isCreatingId ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-3 w-3" />
                        Create OnChainID
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Country */}
          <div>
            <Label className="text-xs text-muted-foreground">Country</Label>
            {userIdentity?.country ? (
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{userIdentity.country}</p>
              </div>
            ) : userIdentity?.onchainIdAddress ? (
              <div className="flex items-center gap-2 mt-2">
                {canRegisterIdentity ? (
                  <>
                    <Input
                      placeholder="US"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="flex-1 bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                      maxLength={2}
                    />
                    <Button
                      size="sm"
                      onClick={handleRegisterIdentity}
                      disabled={isRegistering || !country}
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Identity registry registration is handled by the platform
                    owner.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Create OnChainID to register country
              </p>
            )}
          </div>

          <Separator />

          {/* Verification Status */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Verification Status
            </Label>
            <div className="flex items-center gap-2 mt-1">
              {userIdentity?.isVerified ? (
                <>
                  <Badge variant="default" className="bg-green-600">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    All required claims present
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="secondary">Unverified</Badge>
                  <p className="text-xs text-muted-foreground">
                    {userIdentity?.verificationReason ||
                      "Missing required claims"}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims Card */}
      <Card className="bg-white rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Claims
              </CardTitle>
              <CardDescription>
                Identity attestations from trusted issuers
              </CardDescription>
            </div>
            {/* Only show Add Claim if user is a Trusted Issuer OR viewing their own OnchainID */}
            {userIdentity?.onchainIdAddress &&
              issuerTopics &&
              issuerTopics.length > 0 && (
                <AddClaimDialog
                  identityAddress={userIdentity.onchainIdAddress}
                  issuerTopics={issuerTopics}
                  onSuccess={onUpdate}
                />
              )}
          </div>
        </CardHeader>
        <CardContent>
          {userIdentity?.claims && userIdentity.claims.length > 0 ? (
            <div className="space-y-3">
              {userIdentity.claims.map((claim, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {CLAIM_TOPIC_NAMES[claim.topic] ||
                            `Topic ${claim.topic}`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Issuer:</strong>{" "}
                        <span className="font-mono">
                          {claim.issuer.slice(0, 16)}...
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Data:</strong> {claim.data}
                      </p>
                      {claim.uri && (
                        <a
                          href={claim.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          View proof <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No claims yet</p>
              <p className="text-xs mt-1">
                {userIdentity?.onchainIdAddress
                  ? "Contact an issuer to add claims"
                  : "Create OnChainID to receive claims"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Dialog for adding a new claim (Trusted Issuer only)
 */
function AddClaimDialog({
  identityAddress,
  issuerTopics,
  onSuccess,
}: {
  identityAddress: string;
  issuerTopics: number[];
  onSuccess?: () => void;
}) {
  const { trexClient } = useWallet();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(issuerTopics[0]?.toString() || "1");
  const [data, setData] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("365");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddClaim = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!data) {
      toast.error("Please enter claim data");
      return;
    }

    // Validate that user is authorized for this topic
    const selectedTopic = parseInt(topic);
    if (!issuerTopics.includes(selectedTopic)) {
      toast.error(
        `You are not authorized as a Trusted Issuer for topic ${selectedTopic}`
      );
      return;
    }

    setIsAdding(true);

    try {
      // Calculate expiration timestamp (Unix time in seconds)
      const daysToExpire = parseInt(expiresInDays) || 365;
      const expiresAt =
        Math.floor(Date.now() / 1000) + daysToExpire * 24 * 60 * 60;

      const txHash = await trexClient.addClaim(
        identityAddress,
        parseInt(topic),
        data,
        expiresAt
      );

      toast.success(
        <div>
          <p className="font-semibold">Claim added!</p>
          <p className="text-xs mt-1">TX: {txHash.slice(0, 16)}...</p>
        </div>
      );

      setOpen(false);
      setData("");
      setExpiresInDays("365");
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to add claim:", error);
      toast.error(error.message || "Failed to add claim");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Claim
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Claim</DialogTitle>
          <DialogDescription>
            Add a new claim to this OnChainID. The claim's "issuer" field will
            be your wallet address. You must be either: (1) The issuer listed in
            your Trusted Issuers, OR (2) The OnchainID owner.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Claim Topic (Authorized Only)</Label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {issuerTopics.map((topicId) => {
                const topicNames: Record<number, string> = {
                  1: "KYC (Know Your Customer)",
                  2: "AML (Anti-Money Laundering)",
                  3: "Accredited Investor",
                  4: "Residency Verification",
                  5: "Age Verification",
                };
                return (
                  <option key={topicId} value={topicId}>
                    {topicNames[topicId] || `Topic ${topicId}`}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-muted-foreground">
              Only topics you're authorized for as a Trusted Issuer are shown
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">Claim Data</Label>
            <Input
              id="data"
              placeholder="KYC_VERIFIED_2025"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresInDays">Expires In (days)</Label>
            <Input
              id="expiresInDays"
              type="number"
              placeholder="365"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
            />
            <p className="text-xs text-muted-foreground">
              Claim will expire after this many days (default: 365)
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleAddClaim}
            disabled={isAdding || !data}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Claim...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Claim
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
