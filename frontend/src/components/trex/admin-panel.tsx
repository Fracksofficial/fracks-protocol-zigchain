/**
 * Admin Panel Component
 * Admin functions: mint, freeze, pause, manage issuers
 */

"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Coins,
  Snowflake,
  PauseCircle,
  PlayCircle,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWallet } from "@/hooks/use-wallet";
import { parseTokenAmount } from "@/lib/token-utils";
import { toast } from "sonner";
import type { PermissionsState } from "@/hooks/use-permissions";

interface AdminPanelProps {
  tokenContract?: string; // NEW: Specific token contract to manage
  tokenSymbol?: string;
  tokenDecimals?: number;
  isPaused?: boolean;
  permissions?: PermissionsState;
  onUpdate?: () => void;
}

export function AdminPanel({
  tokenContract, // NEW
  tokenSymbol = "TREX",
  tokenDecimals = 6,
  isPaused = false,
  permissions,
  onUpdate,
}: AdminPanelProps) {
  const { address, trexClient } = useWallet();
  const [isTirOwner, setIsTirOwner] = useState(false);
  const canMint = !!permissions?.isTokenIssuer;
  const canFreeze = !!(permissions?.isTokenOwner || permissions?.isTokenAgent);
  const canPause = !!permissions?.isTokenOwner;
  const canManageAgents = !!permissions?.isTokenOwner;
  const canManageIssuers = isTirOwner;
  const canShowAnyTab =
    canMint || canFreeze || canPause || canManageAgents || canManageIssuers;
  const tabCount = [canMint, canFreeze, canPause, canManageAgents, canManageIssuers]
    .filter(Boolean).length;

  useEffect(() => {
    let isMounted = true;
    const loadTirOwner = async () => {
      if (!trexClient || !address) {
        setIsTirOwner(false);
        return;
      }

      try {
        const owner = await trexClient.getTirOwner();
        if (!isMounted) return;
        setIsTirOwner(!!owner && owner.toLowerCase() === address.toLowerCase());
      } catch (error) {
        if (!isMounted) return;
        setIsTirOwner(false);
      }
    };

    loadTirOwner();
    return () => {
      isMounted = false;
    };
  }, [trexClient, address]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Panel
        </CardTitle>
        <CardDescription>
          Role-restricted token management and compliance administration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No Token Selected Warning */}
        {!tokenContract && (
          <Alert className="glass-panel mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a token from the dropdown above to enable admin
              operations
            </AlertDescription>
          </Alert>
        )}

        {tokenContract && (
          <Alert className="glass-panel mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Admin operations are restricted by the smart contract. If you're
              not the token owner, transactions will fail.
              <br />
              <span className="text-muted-foreground mt-1 block">
                Connected wallet: {address?.slice(0, 20)}...
              </span>
            </AlertDescription>
          </Alert>
        )}

        {!canShowAnyTab && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your wallet does not have admin permissions for this token.
            </AlertDescription>
          </Alert>
        )}

        {canShowAnyTab && (
          <Tabs
            defaultValue={
              canMint
                ? "mint"
                : canFreeze
                ? "freeze"
                : canPause
                ? "pause"
                : canManageAgents
                ? "agents"
                : "issuers"
            }
            className="w-full"
          >
            <TabsList
              className={`w-fit grid rounded-2xl h-auto bg-white/70 border border-slate-200/70 shadow-sm backdrop-blur-md ${
                tabCount === 1
                  ? "grid-cols-1"
                  : tabCount === 2
                  ? "grid-cols-2"
                  : tabCount === 3
                  ? "grid-cols-3"
                  : tabCount === 4
                  ? "grid-cols-4"
                  : "grid-cols-5"
              }`}
            >
              {canMint && (
                <TabsTrigger
                  value="mint"
                  disabled={!tokenContract}
                  className="rounded-xl px-4 py-2 data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all text-sm"
                >
                  Mint
                </TabsTrigger>
              )}
              {canFreeze && (
                <TabsTrigger
                  value="freeze"
                  disabled={!tokenContract}
                  className="rounded-xl px-4 py-2 data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all text-sm"
                >
                  Freeze
                </TabsTrigger>
              )}
              {canPause && (
                <TabsTrigger
                  value="pause"
                  disabled={!tokenContract}
                  className="rounded-xl px-4 py-2 data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all text-sm"
                >
                  Pause
                </TabsTrigger>
              )}
              {canManageAgents && (
                <TabsTrigger
                  value="agents"
                  disabled={!tokenContract}
                  className="rounded-xl px-4 py-2 data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all text-sm"
                >
                  Agents
                </TabsTrigger>
              )}
              {canManageIssuers && (
                <TabsTrigger
                  value="issuers"
                  disabled={!tokenContract}
                  className="rounded-xl px-4 py-2 data-[state=active]:bg-linear-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all text-sm"
                >
                  Issuers
                </TabsTrigger>
              )}
            </TabsList>

            {canMint && (
              <TabsContent value="mint" className="space-y-4 mt-4">
                <MintTokensTab
                  tokenContract={tokenContract}
                  tokenSymbol={tokenSymbol}
                  tokenDecimals={tokenDecimals}
                  onSuccess={onUpdate}
                />
              </TabsContent>
            )}

            {canFreeze && (
              <TabsContent value="freeze" className="space-y-4 mt-4">
                <FreezeAddressTab
                  tokenContract={tokenContract}
                  onSuccess={onUpdate}
                />
              </TabsContent>
            )}

            {canPause && (
              <TabsContent value="pause" className="space-y-4 mt-4">
                <PauseTokenTab
                  tokenContract={tokenContract}
                  isPaused={isPaused}
                  onSuccess={onUpdate}
                />
              </TabsContent>
            )}

            {canManageAgents && (
              <TabsContent value="agents" className="space-y-4 mt-4">
                <ManageAgentsTab
                  tokenContract={tokenContract}
                  onSuccess={onUpdate}
                />
              </TabsContent>
            )}

            {canManageIssuers && (
              <TabsContent value="issuers" className="space-y-4 mt-4">
                <ManageIssuersTab
                  tokenContract={tokenContract}
                  onSuccess={onUpdate}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Mint Tokens Tab
 */
function MintTokensTab({
  tokenContract,
  tokenSymbol,
  tokenDecimals,
  onSuccess,
}: {
  tokenContract?: string;
  tokenSymbol: string;
  tokenDecimals: number;
  onSuccess?: () => void;
}) {
  const { trexClient } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!recipient || !amount) {
      toast.error("Please enter recipient and amount");
      return;
    }

    setIsMinting(true);

    try {
      const microAmount = parseTokenAmount(amount, tokenDecimals);
      await trexClient.mint(recipient, microAmount, tokenContract);

      toast.success(
        <div>
          <p className="font-semibold">Tokens minted!</p>
          <p className="text-xs mt-1">
            {amount} {tokenSymbol} to {recipient.slice(0, 10)}...
          </p>
        </div>
      );

      setRecipient("");
      setAmount("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Mint failed:", error);
      toast.error(error.message || "Failed to mint tokens");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mint-recipient">Recipient Address</Label>
        <Input
          id="mint-recipient"
          placeholder="zig1..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={isMinting}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mint-amount">Amount</Label>
        <Input
          id="mint-amount"
          type="number"
          placeholder="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isMinting}
          className="h-11"
        />
      </div>
      <Button
        className="w-full bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
        onClick={handleMint}
        disabled={isMinting || !recipient || !amount}
      >
        {isMinting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Minting...
          </>
        ) : (
          <>
            <Coins className="mr-2 h-4 w-4" />
            Mint Tokens
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Note: Recipient must have a verified identity to receive tokens.
      </p>
    </div>
  );
}

/**
 * Freeze Address Tab
 */
function FreezeAddressTab({
  tokenContract,
  onSuccess,
}: {
  tokenContract?: string;
  onSuccess?: () => void;
}) {
  const { trexClient } = useWallet();
  const [address, setAddress] = useState("");
  const [isFreezing, setIsFreezing] = useState(false);
  const [isUnfreezing, setIsUnfreezing] = useState(false);
  const [isFrozen, setIsFrozen] = useState<boolean | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check freeze status when address changes
  useEffect(() => {
    const checkFreezeStatus = async () => {
      if (
        !trexClient ||
        !address ||
        !address.startsWith("zig1") ||
        address.length < 40
      ) {
        setIsFrozen(null);
        return;
      }

      setCheckingStatus(true);
      try {
        const frozen = await trexClient.isFrozen(address, tokenContract);
        setIsFrozen(frozen);
      } catch (error) {
        console.error("Failed to check freeze status:", error);
        setIsFrozen(null);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Debounce the check
    const timer = setTimeout(checkFreezeStatus, 500);
    return () => clearTimeout(timer);
  }, [address, trexClient, tokenContract]);

  const handleFreeze = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet and select a token first");
      return;
    }

    if (!address) {
      toast.error("Please enter an address");
      return;
    }

    setIsFreezing(true);

    try {
      const txHash = await trexClient.freezeAddress(address, tokenContract);

      toast.success(
        <div>
          <p className="font-semibold">Address frozen!</p>
          <p className="text-xs mt-1">{address.slice(0, 16)}...</p>
        </div>
      );

      setIsFrozen(true);
      setAddress("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Freeze failed:", error);
      toast.error(error.message || "Failed to freeze address");
    } finally {
      setIsFreezing(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet and select a token first");
      return;
    }

    if (!address) {
      toast.error("Please enter an address");
      return;
    }

    setIsUnfreezing(true);

    try {
      const txHash = await trexClient.unfreezeAddress(address, tokenContract);

      toast.success(
        <div>
          <p className="font-semibold">Address unfrozen!</p>
          <p className="text-xs mt-1">{address.slice(0, 16)}...</p>
        </div>
      );

      setIsFrozen(false);
      setAddress("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Unfreeze failed:", error);
      toast.error(error.message || "Failed to unfreeze address");
    } finally {
      setIsUnfreezing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="freeze-address">Address to Freeze/Unfreeze</Label>
        <Input
          id="freeze-address"
          placeholder="zig1..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isFreezing || isUnfreezing}
          className="h-11"
        />

        {/* Freeze Status Indicator */}
        {address && address.startsWith("zig1") && address.length >= 40 && (
          <div className="flex items-center gap-2 text-sm">
            {checkingStatus ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">
                  Checking status...
                </span>
              </>
            ) : isFrozen !== null ? (
              <>
                {isFrozen ? (
                  <>
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1"
                    >
                      <Snowflake className="h-3 w-3" />
                      Frozen
                    </Badge>
                    <span className="text-muted-foreground">
                      This address cannot transfer tokens
                    </span>
                  </>
                ) : (
                  <>
                    <Badge
                      variant="success"
                      className="flex items-center gap-1"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Active
                    </Badge>
                    <span className="text-muted-foreground">
                      This address can transfer tokens
                    </span>
                  </>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleFreeze}
          disabled={isFreezing || isUnfreezing || !address}
        >
          {isFreezing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Freezing...
            </>
          ) : (
            <>
              <Snowflake className="mr-2 h-4 w-4" />
              Freeze
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleUnfreeze}
          disabled={isFreezing || isUnfreezing || !address}
        >
          {isUnfreezing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Unfreezing...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Unfreeze
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Frozen addresses cannot send or receive tokens.
      </p>
    </div>
  );
}

/**
 * Pause Token Tab
 */
function PauseTokenTab({
  tokenContract,
  isPaused,
  onSuccess,
}: {
  tokenContract?: string;
  isPaused: boolean;
  onSuccess?: () => void;
}) {
  const { trexClient } = useWallet();
  const [isPausing, setIsPausing] = useState(false);
  const [isUnpausing, setIsUnpausing] = useState(false);

  const handlePause = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet and select a token first");
      return;
    }

    setIsPausing(true);

    try {
      const txHash = await trexClient.pauseToken(tokenContract);

      toast.success("Token paused! All transfers are now blocked.");
      onSuccess?.();
    } catch (error: any) {
      console.error("Pause failed:", error);
      toast.error(error.message || "Failed to pause token");
    } finally {
      setIsPausing(false);
    }
  };

  const handleUnpause = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet and select a token first");
      return;
    }

    setIsUnpausing(true);

    try {
      const txHash = await trexClient.unpauseToken(tokenContract);

      toast.success("Token unpaused! Transfers are now enabled.");
      onSuccess?.();
    } catch (error: any) {
      console.error("Unpause failed:", error);
      toast.error(error.message || "Failed to unpause token");
    } finally {
      setIsUnpausing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-sm font-medium">Current Status</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isPaused ? "destructive" : "default"}>
            {isPaused ? "Paused" : "Active"}
          </Badge>
          <p className="text-xs text-muted-foreground">
            {isPaused ? "All transfers are blocked" : "Transfers are enabled"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handlePause}
          disabled={isPausing || isUnpausing || isPaused}
        >
          {isPausing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Pausing...
            </>
          ) : (
            <>
              <PauseCircle className="mr-2 h-4 w-4" />
              Pause Token
            </>
          )}
        </Button>
        <Button
          className="flex-1 bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
          onClick={handleUnpause}
          disabled={isPausing || isUnpausing || !isPaused}
        >
          {isUnpausing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Unpausing...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Unpause Token
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Pausing the token will block all transfers until unpaused.
      </p>
    </div>
  );
}

/**
 * Manage Agents Tab
 */
function ManageAgentsTab({
  tokenContract,
  onSuccess,
}: {
  tokenContract?: string;
  onSuccess?: () => void;
}) {
  const { trexClient } = useWallet();
  const [agentAddress, setAgentAddress] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAddAgent = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet and select a token first");
      return;
    }

    if (!agentAddress) {
      toast.error("Please enter an agent address");
      return;
    }

    // Validate address format
    if (!agentAddress.startsWith("zig1")) {
      toast.error('Invalid ZigChain address. Should start with "zig1"');
      return;
    }

    setIsAdding(true);

    try {
      const txHash = await trexClient.addAgent(agentAddress, tokenContract);

      toast.success(
        <div>
          <p className="font-semibold">Agent added successfully!</p>
          <p className="text-xs mt-1">{agentAddress.slice(0, 20)}...</p>
          <p className="text-xs text-muted-foreground">
            TX: {txHash.slice(0, 16)}...
          </p>
        </div>
      );

      setAgentAddress("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Add agent failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error(
          <div>
            <p className="font-semibold">Authorization Failed</p>
            <p className="text-xs mt-1">
              Only the token Owner can add agents.
              <br />
              Your wallet may not have the required permissions.
            </p>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error(error.message || "Failed to add agent");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAgent = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet and select a token first");
      return;
    }

    if (!agentAddress) {
      toast.error("Please enter an agent address");
      return;
    }

    setIsRemoving(true);

    try {
      const txHash = await trexClient.removeAgent(agentAddress, tokenContract);

      toast.success(
        <div>
          <p className="font-semibold">Agent removed successfully!</p>
          <p className="text-xs mt-1">{agentAddress.slice(0, 20)}...</p>
          <p className="text-xs text-muted-foreground">
            TX: {txHash.slice(0, 16)}...
          </p>
        </div>
      );

      setAgentAddress("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Remove agent failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error(
          <div>
            <p className="font-semibold">Authorization Failed</p>
            <p className="text-xs mt-1">
              Only the token Owner can remove agents.
            </p>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error(error.message || "Failed to remove agent");
      }
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert
        variant="default"
        className="glass-panel"
      >
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle className="text-slate-900">
          Agent Permissions
        </AlertTitle>
        <AlertDescription className="text-slate-700 text-sm">
          Agents can perform privileged operations such as KYC approval,
          freezing accounts, and updating compliance settings. Only grant agent
          status to trusted addresses.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="agent-address">Agent Address</Label>
        <Input
          id="agent-address"
          placeholder="zig1..."
          value={agentAddress}
          onChange={(e) => setAgentAddress(e.target.value)}
          disabled={isAdding || isRemoving}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Enter the ZigChain address to grant or revoke agent permissions
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1 bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
          onClick={handleAddAgent}
          disabled={isAdding || isRemoving || !agentAddress}
        >
          {isAdding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Add Agent
            </>
          )}
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleRemoveAgent}
          disabled={isAdding || isRemoving || !agentAddress}
        >
          {isRemoving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <AlertCircle className="mr-2 h-4 w-4" />
              Remove Agent
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Only the token owner can add or remove agents. Agent permissions
        apply to this specific token.
      </p>
    </div>
  );
}

/**
 * Manage Issuers Tab
 */
function ManageIssuersTab({
  tokenContract,
  onSuccess,
}: {
  tokenContract?: string;
  onSuccess?: () => void;
}) {
  const { trexClient } = useWallet();
  const [issuerAddress, setIssuerAddress] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<number[]>([1, 2]);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddIssuer = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!issuerAddress) {
      toast.error("Please enter issuer address");
      return;
    }

    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }

    setIsAdding(true);

    try {
      const txHash = await trexClient.addTrustedIssuer(
        issuerAddress,
        selectedTopics
      );

      toast.success(
        <div>
          <p className="font-semibold">Trusted issuer added!</p>
          <p className="text-xs mt-1">Topics: {selectedTopics.join(", ")}</p>
        </div>
      );

      setIssuerAddress("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Add issuer failed:", error);

      // Better error messaging for authorization issues
      if (error.message?.includes("Unauthorized")) {
        toast.error(
          <div>
            <p className="font-semibold">Authorization Failed</p>
            <p className="text-xs mt-1">
              Only the TIR contract owner can add trusted issuers.
              <br />
              Your wallet may not have the required permissions.
            </p>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error(error.message || "Failed to add trusted issuer");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTopic = (topic: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="issuer-address">Issuer Address</Label>
        <Input
          id="issuer-address"
          placeholder="zig1..."
          value={issuerAddress}
          onChange={(e) => setIssuerAddress(e.target.value)}
          disabled={isAdding}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label>Claim Topics</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { id: 1, name: "KYC (Know Your Customer)" },
            { id: 2, name: "AML (Anti-Money Laundering)" },
            { id: 3, name: "Accredited Investor" },
            { id: 4, name: "Residency Verification" },
          ].map((topic) => (
            <label
              key={topic.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300/80"
            >
              <Checkbox
                checked={selectedTopics.includes(topic.id)}
                onCheckedChange={() => toggleTopic(topic.id)}
                disabled={isAdding}
              />
              <span className="text-sm">{topic.name}</span>
            </label>
          ))}
        </div>
      </div>

      <Button
        className="w-full bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
        onClick={handleAddIssuer}
        disabled={isAdding || !issuerAddress || selectedTopics.length === 0}
      >
        {isAdding ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding Issuer...
          </>
        ) : (
          <>
            <Users className="mr-2 h-4 w-4" />
            Add Trusted Issuer
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        Note: Only trusted issuers can provide claims for identity verification.
      </p>
    </div>
  );
}
