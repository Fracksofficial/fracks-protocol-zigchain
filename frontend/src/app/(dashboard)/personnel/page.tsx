"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Snowflake, AlertCircle } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useAssetsContext } from "@/contexts/assets-context";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_WALLETS } from "@/lib/zigchain-config";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TokenSelector } from "@/components/rwa/token-selector";
import { toast } from "sonner";

const CLAIM_TOPICS = [
  { id: 1, name: "KYC (Know Your Customer)" },
  { id: 2, name: "AML (Anti-Money Laundering)" },
  { id: 3, name: "Accredited Investor" },
  { id: 4, name: "Residency Verification" },
];

export default function PersonnelPage() {
  const { address, trexClient, connectKeplr, isConnecting, isConnected } =
    useWallet();
  const { assets, loadAssets } = useAssetsContext();
  const [selectedTokenContract, setSelectedTokenContract] = useState<
    string | null
  >(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [isTirOwner, setIsTirOwner] = useState(false);

  const { permissions } = usePermissions({
    trexClient,
    walletAddress: address,
    tokenContract: selectedTokenContract || undefined,
  });

  const isPlatformOwner =
    !!address &&
    address.toLowerCase() === ROLE_WALLETS.platformOwner.toLowerCase();
  const canManageAgents = !!permissions?.isTokenOwner;
  const canFreeze = !!(permissions?.isTokenOwner || permissions?.isTokenAgent);

  const [issuerAddress, setIssuerAddress] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<number[]>([1, 2]);
  const [issuerToRemove, setIssuerToRemove] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [freezeAddress, setFreezeAddress] = useState("");
  const [isWorking, setIsWorking] = useState(false);

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
      } catch {
        if (!isMounted) return;
        setIsTirOwner(false);
      }
    };
    loadTirOwner();
    return () => {
      isMounted = false;
    };
  }, [trexClient, address]);

  const handleTokenSelect = (
    contract: string,
    _assetId: string,
    symbol: string,
  ) => {
    setSelectedTokenContract(contract);
    setSelectedSymbol(symbol);
  };

  const toggleTopic = (topic: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((id) => id !== topic)
        : [...prev, topic],
    );
  };

  const handleAddIssuer = async () => {
    if (!trexClient) return;
    if (!issuerAddress || selectedTopics.length === 0) {
      toast.error("Enter issuer address and topics");
      return;
    }
    setIsWorking(true);
    try {
      await trexClient.addTrustedIssuer(issuerAddress, selectedTopics);
      toast.success("Trusted issuer added");
      setIssuerAddress("");
    } catch (error: any) {
      toast.error(error.message || "Failed to add issuer");
    } finally {
      setIsWorking(false);
    }
  };

  const handleTransferTirOwnership = async () => {
    if (!trexClient) return;
    setIsWorking(true);
    try {
      await trexClient.updateTirOwner(ROLE_WALLETS.platformOwner);
      toast.success("Trusted Issuers Registry owner updated");
      setIsTirOwner(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to update TIR owner");
    } finally {
      setIsWorking(false);
    }
  };

  const handleRemoveIssuer = async () => {
    if (!trexClient) return;
    if (!issuerToRemove) {
      toast.error("Enter issuer address");
      return;
    }
    setIsWorking(true);
    try {
      await trexClient.removeTrustedIssuer(issuerToRemove);
      toast.success("Trusted issuer removed");
      setIssuerToRemove("");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove issuer");
    } finally {
      setIsWorking(false);
    }
  };

  const handleAddAgent = async () => {
    if (!trexClient || !selectedTokenContract) return;
    if (!agentAddress) {
      toast.error("Enter agent address");
      return;
    }
    setIsWorking(true);
    try {
      await trexClient.addAgent(agentAddress, selectedTokenContract);
      toast.success("Agent added");
      setAgentAddress("");
    } catch (error: any) {
      toast.error(error.message || "Failed to add agent");
    } finally {
      setIsWorking(false);
    }
  };

  const handleRemoveAgent = async () => {
    if (!trexClient || !selectedTokenContract) return;
    if (!agentAddress) {
      toast.error("Enter agent address");
      return;
    }
    setIsWorking(true);
    try {
      await trexClient.removeAgent(agentAddress, selectedTokenContract);
      toast.success("Agent removed");
      setAgentAddress("");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove agent");
    } finally {
      setIsWorking(false);
    }
  };

  const handleFreeze = async (action: "freeze" | "unfreeze") => {
    if (!trexClient || !selectedTokenContract) return;
    if (!freezeAddress) {
      toast.error("Enter a wallet address");
      return;
    }
    setIsWorking(true);
    try {
      if (action === "freeze") {
        await trexClient.freezeAddress(freezeAddress, selectedTokenContract);
        toast.success("Address frozen");
      } else {
        await trexClient.unfreezeAddress(freezeAddress, selectedTokenContract);
        toast.success("Address unfrozen");
      }
      setFreezeAddress("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update freeze status");
    } finally {
      setIsWorking(false);
    }
  };

  const tokenSelection = useMemo(
    () => (
      <Card className="bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Token context</CardTitle>
          <CardDescription>
            Select the token contract to manage agents and freezes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenSelector
            selectedTokenContract={selectedTokenContract}
            onSelect={handleTokenSelect}
            className="max-w-md"
          />
          {selectedTokenContract && (
            <p className="text-xs text-muted-foreground mt-3">
              Selected token:{" "}
              {selectedSymbol || selectedTokenContract.slice(0, 12) + "..."}
            </p>
          )}
        </CardContent>
      </Card>
    ),
    [selectedTokenContract, selectedSymbol],
  );

  if (!isConnected) {
    return (
      <div className="py-12 text-center space-y-4">
        <h1 className="text-3xl font-bold">Personnel Management</h1>
        <p className="text-muted-foreground">
          Connect your wallet to manage platform personnel.
        </p>
        <Button size="lg" onClick={connectKeplr} disabled={isConnecting}>
          Connect Keplr Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 glass-panel rounded-[22px]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Personnel Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage trusted issuers, token agents, and frozen wallets.
        </p>
      </motion.div>

      {tokenSelection}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Trusted Issuers (KYC Providers)
            </CardTitle>
            <CardDescription>
              Add or remove KYC issuers from the Trusted Issuers Registry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isTirOwner && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  On-chain permissions still apply. If this wallet is not the
                  TIR owner, issuer updates will fail.
                </AlertDescription>
              </Alert>
            )}

            {!isPlatformOwner && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTransferTirOwnership}
                disabled={isWorking}
              >
                Make platform owner the TIR owner
              </Button>
            )}

            <div className="space-y-2">
              <Label htmlFor="issuer-add">Issuer Address</Label>
              <Input
                id="issuer-add"
                placeholder="zig1..."
                value={issuerAddress}
                onChange={(e) => setIssuerAddress(e.target.value)}
                disabled={isWorking}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Claim Topics</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {CLAIM_TOPICS.map((topic) => (
                  <label
                    key={topic.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300/80"
                  >
                    <Checkbox
                      checked={selectedTopics.includes(topic.id)}
                      onCheckedChange={() => toggleTopic(topic.id)}
                      disabled={isWorking}
                    />
                    <span>{topic.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="w-full bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90"
              onClick={handleAddIssuer}
              disabled={isWorking || !issuerAddress}
            >
              Add Trusted Issuer
            </Button>

            <div className="space-y-2 pt-2">
              <Label htmlFor="issuer-remove">Remove Issuer</Label>
              <Input
                id="issuer-remove"
                placeholder="zig1..."
                value={issuerToRemove}
                onChange={(e) => setIssuerToRemove(e.target.value)}
                disabled={isWorking}
                className="h-11"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRemoveIssuer}
                disabled={isWorking || !issuerToRemove}
              >
                Remove Issuer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Token Agents
            </CardTitle>
            <CardDescription>
              Assign agent wallets for a specific token contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedTokenContract && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Select a token to manage its agents.
                </AlertDescription>
              </Alert>
            )}
            {selectedTokenContract && !canManageAgents && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  On-chain permissions still apply. If this wallet is not the
                  token owner, agent updates will fail.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="agent-address">Agent Address</Label>
              <Input
                id="agent-address"
                placeholder="zig1..."
                value={agentAddress}
                onChange={(e) => setAgentAddress(e.target.value)}
                disabled={!selectedTokenContract || isWorking}
                className="h-11"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90"
                onClick={handleAddAgent}
                disabled={!selectedTokenContract || isWorking || !agentAddress}
              >
                Add Agent
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRemoveAgent}
                disabled={!selectedTokenContract || isWorking || !agentAddress}
              >
                Remove Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            Freeze / Unfreeze Wallets
          </CardTitle>
          <CardDescription>
            Freeze token transfers for specific wallets (token owner or agent).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedTokenContract && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select a token to update freeze status.
              </AlertDescription>
            </Alert>
          )}
          {selectedTokenContract && !canFreeze && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                On-chain permissions still apply. If this wallet is not an
                owner/agent, freeze actions will fail.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="freeze-address">Wallet Address</Label>
            <Input
              id="freeze-address"
              placeholder="zig1..."
              value={freezeAddress}
              onChange={(e) => setFreezeAddress(e.target.value)}
              disabled={!selectedTokenContract || isWorking}
              className="h-11"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleFreeze("freeze")}
              disabled={!selectedTokenContract || isWorking || !freezeAddress}
            >
              Freeze
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleFreeze("unfreeze")}
              disabled={!selectedTokenContract || isWorking || !freezeAddress}
            >
              Unfreeze
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
