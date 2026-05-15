/**
 * Identity Registry Admin Panel
 * Allows admins to register identities for other users
 */

"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Users,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

// Common country codes
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "CH", name: "Switzerland" },
];

interface IdentityRegistryAdminProps {
  onUpdate?: () => void;
}

export function IdentityRegistryAdmin({
  onUpdate,
}: IdentityRegistryAdminProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Identity Registry Administration
        </CardTitle>
        <CardDescription>
          Register and manage investor identities (Admin only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-fit grid-cols-2 p-1 bg-[#F1F2F4] rounded-xl h-auto">
            <TabsTrigger
              value="register"
              className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
            >
              Register Identity
            </TabsTrigger>
            <TabsTrigger
              value="lookup"
              className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
            >
              Lookup Identity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-4 mt-4">
            <RegisterIdentityTab onSuccess={onUpdate} />
          </TabsContent>

          <TabsContent value="lookup" className="space-y-4 mt-4">
            <LookupIdentityTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
function RegisterIdentityTab({ onSuccess }: { onSuccess?: () => void }) {
  const { trexClient } = useWallet();
  const [walletAddress, setWalletAddress] = useState("");
  const [identityAddress, setIdentityAddress] = useState("");
  const [country, setCountry] = useState("US");
  const [createNewIdentity, setCreateNewIdentity] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRegister = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!walletAddress) {
      toast.error("Please enter investor wallet address");
      return;
    }

    // Validate wallet address
    if (!walletAddress.startsWith("zig1")) {
      toast.error('Invalid ZigChain address. Should start with "zig1"');
      return;
    }

    if (!createNewIdentity && !identityAddress) {
      toast.error(
        'Please enter OnchainID contract address or select "Create New Identity"'
      );
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Processing identity registration...");

    try {
      let finalIdentityAddress = identityAddress;

      // Step 1: Create OnchainID if needed
      if (createNewIdentity) {
        toast.loading("Step 1/2: Creating OnchainID contract...", {
          id: loadingToast,
        });

        finalIdentityAddress = await trexClient.createOnChainIdForInvestor(
          walletAddress,
          `OnchainID for ${walletAddress.slice(0, 10)}...`
        );

        toast.loading(`Step 2/2: Registering identity in registry...`, {
          id: loadingToast,
        });
      }

      // Step 2: Register in Identity Registry
      const txHash = await trexClient.registerIdentity(
        walletAddress,
        finalIdentityAddress,
        country
      );

      toast.success(
        <div>
          <p className="font-semibold">Identity registered successfully!</p>
          <p className="text-xs mt-1">
            Wallet: {walletAddress.slice(0, 20)}...
          </p>
          <p className="text-xs">
            OnchainID: {finalIdentityAddress.slice(0, 20)}...
          </p>
          <p className="text-xs">Country: {country}</p>
          <p className="text-xs text-muted-foreground mt-1">
            TX: {txHash.slice(0, 16)}...
          </p>
        </div>,
        { id: loadingToast, duration: 6000 }
      );

      // Reset form
      setWalletAddress("");
      setIdentityAddress("");
      setCountry("US");
      onSuccess?.();
    } catch (error: any) {
      console.error("Identity registration failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error(
          <div>
            <p className="font-semibold">Authorization Failed</p>
            <p className="text-xs mt-1">
              Only the Identity Registry owner can register identities.
              <br />
              Your wallet may not have the required permissions.
            </p>
          </div>,
          { id: loadingToast, duration: 6000 }
        );
      } else if (error.message?.includes("already registered")) {
        toast.error(
          <div>
            <p className="font-semibold">Already Registered</p>
            <p className="text-xs mt-1">
              This wallet already has an identity registered.
              <br />
              Use the "Lookup Identity" tab to view existing registration.
            </p>
          </div>,
          { id: loadingToast, duration: 6000 }
        );
      } else {
        toast.error(error.message || "Failed to register identity", {
          id: loadingToast,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert
        variant="default"
        className="border-blue-100 bg-blue-50/50 rounded-xl"
      >
        <AlertCircle className="h-4 w-4 text-[#172E7F]" />
        <AlertTitle className="text-[#172E7F]">
          Identity Registration
        </AlertTitle>
        <AlertDescription className="text-blue-700 text-sm">
          Register investor wallets with their OnchainID contracts. This links
          the wallet address to an identity that will store KYC claims. You can
          create a new OnchainID or link to an existing one.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="wallet-address">Investor Wallet Address *</Label>
        <Input
          id="wallet-address"
          placeholder="zig1..."
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          disabled={isProcessing}
        />
        <p className="text-xs text-muted-foreground">
          The investor's ZigChain wallet address that will be linked to the
          identity
        </p>
      </div>

      <div className="space-y-2">
        <Label>Identity Setup</Label>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={createNewIdentity}
              onChange={() => setCreateNewIdentity(true)}
              className="rounded-full border-input"
              disabled={isProcessing}
            />
            <span className="text-sm">Create new OnchainID contract</span>
            <Badge variant="secondary" className="ml-auto">
              Recommended
            </Badge>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!createNewIdentity}
              onChange={() => setCreateNewIdentity(false)}
              className="rounded-full border-input"
              disabled={isProcessing}
            />
            <span className="text-sm">Link to existing OnchainID</span>
          </label>
        </div>
      </div>

      {!createNewIdentity && (
        <div className="space-y-2">
          <Label htmlFor="identity-address">OnchainID Contract Address *</Label>
          <Input
            id="identity-address"
            placeholder="zig1..."
            value={identityAddress}
            onChange={(e) => setIdentityAddress(e.target.value)}
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground">
            Address of an existing OnchainID contract to link
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="country">Country / Jurisdiction *</Label>
        <Select
          value={country}
          onValueChange={setCountry}
          disabled={isProcessing}
        >
          <SelectTrigger id="country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Used for jurisdiction-based compliance rules
        </p>
      </div>

      <Button
        className="w-full"
        onClick={handleRegister}
        disabled={
          isProcessing ||
          !walletAddress ||
          (!createNewIdentity && !identityAddress)
        }
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {createNewIdentity ? "Creating & Registering..." : "Registering..."}
          </>
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Register Identity
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        ⚠️ Only the Identity Registry owner can register identities. After
        registration, trusted issuers can add KYC claims to the OnchainID.
      </p>
    </div>
  );
}

/**
 * Lookup Identity Tab
 */
function LookupIdentityTab() {
  const { trexClient } = useWallet();
  const [walletAddress, setWalletAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [identity, setIdentity] = useState<any>(null);

  const handleLookup = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!walletAddress) {
      toast.error("Please enter a wallet address");
      return;
    }

    // Validate address format
    if (!walletAddress.startsWith("zig1")) {
      toast.error('Invalid ZigChain address. Should start with "zig1"');
      return;
    }

    setIsSearching(true);
    setIdentity(null);

    try {
      const userIdentity = await trexClient.getUserIdentity(walletAddress);

      if (!userIdentity.onchainIdAddress) {
        toast.info("No identity found for this wallet", {
          description:
            "This wallet has not been registered in the Identity Registry yet",
        });
        return;
      }

      setIdentity(userIdentity);
      toast.success("Identity found!");
    } catch (error: any) {
      console.error("Lookup failed:", error);
      toast.error("Failed to lookup identity", {
        description: error.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lookup-wallet">Wallet Address</Label>
        <div className="flex gap-2">
          <Input
            id="lookup-wallet"
            placeholder="zig1..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            disabled={isSearching}
          />
          <Button
            onClick={handleLookup}
            disabled={isSearching || !walletAddress}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {identity && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">Registration Status</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={identity.isVerified ? "default" : "secondary"}>
                  {identity.isVerified ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 h-3 w-3" />
                      Not Verified
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Wallet Address</p>
              <p className="text-sm font-mono break-all">{walletAddress}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                OnchainID Contract
              </p>
              <p className="text-sm font-mono break-all">
                {identity.onchainIdAddress}
              </p>
            </div>
            {identity.country && (
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm">{identity.country}</p>
              </div>
            )}
          </div>

          {!identity.isVerified && identity.verificationReason && (
            <Alert
              variant="destructive"
              className="rounded-xl bg-red-50 border-red-100 text-red-800"
            >
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-xs">
                <strong>Not Verified:</strong> {identity.verificationReason}
              </AlertDescription>
            </Alert>
          )}

          {identity.isVerified && (
            <Alert
              variant="default"
              className="border-green-100 bg-green-50/50 rounded-xl"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-xs">
                This investor has all required KYC claims and is authorized to
                transact tokens.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
