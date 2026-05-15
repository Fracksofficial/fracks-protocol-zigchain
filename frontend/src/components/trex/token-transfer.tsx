/**
 * Token Transfer Component
 * Allows users to transfer TREX tokens with compliance pre-check
 */

"use client";

import { useState } from "react";
import { Send, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWallet } from "@/hooks/use-wallet";
import { parseTokenAmount, formatTokenAmount } from "@/lib/token-utils";
import { toast } from "sonner";

interface TokenTransferProps {
  tokenContract?: string; // NEW: Specific token contract to use
  tokenSymbol?: string;
  tokenDecimals?: number;
  userBalance?: string;
  userIdentity?: any; // User's identity for verification check
  onSuccess?: () => void;
}

export function TokenTransfer({
  tokenContract, // NEW
  tokenSymbol = "TREX",
  tokenDecimals = 6,
  userBalance = "0",
  userIdentity,
  onSuccess,
}: TokenTransferProps) {
  const { trexClient, address } = useWallet();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<{
    checked: boolean;
    allowed: boolean;
    reason?: string;
  } | null>(null);

  /**
   * Check if transfer would be compliant
   */
  const handleComplianceCheck = async () => {
    if (!trexClient || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!tokenContract) {
      toast.error("Please select a token first");
      return;
    }

    if (!recipient || !amount) {
      toast.error("Please enter recipient and amount");
      return;
    }

    // Validate address format
    if (!recipient.startsWith("zig1") || recipient.length < 40) {
      toast.error("Invalid recipient address");
      return;
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    // Check balance - use string comparison to avoid floating point errors
    const microAmount = parseTokenAmount(amount, tokenDecimals);
    const balanceMicro = BigInt(userBalance);
    const amountMicro = BigInt(microAmount);

    if (amountMicro > balanceMicro) {
      toast.error(
        `Insufficient balance. You have ${formatTokenAmount(
          userBalance,
          tokenDecimals
        )} ${tokenSymbol}`
      );
      return;
    }

    setIsChecking(true);
    setComplianceStatus(null);

    try {
      const requiredTopics =
        (await trexClient.getRequiredTopics().catch(() => null))?.topics || [];
      const hasRequiredClaims = (
        identity: any,
        topics: number[]
      ): boolean => {
        if (!topics.length) return true;
        if (!identity?.claims || identity.claims.length === 0) return false;
        return topics.every((topic: number) =>
          identity.claims.some((claim: any) => claim.topic === topic)
        );
      };

      const senderIdentity =
        userIdentity || (await trexClient.getUserIdentity(address));
      if (!senderIdentity?.onchainIdAddress) {
        setComplianceStatus({
          checked: true,
          allowed: false,
          reason: "Sender does not have an OnChainID registered.",
        });
        toast.error("Sender identity not registered");
        return;
      }

      if (!senderIdentity?.isVerified) {
        setComplianceStatus({
          checked: true,
          allowed: false,
          reason: senderIdentity?.verificationReason || "Sender is not verified.",
        });
        toast.error("Sender identity not verified");
        return;
      }

      if (!hasRequiredClaims(senderIdentity, requiredTopics)) {
        setComplianceStatus({
          checked: true,
          allowed: false,
          reason: "Sender is missing required compliance claims.",
        });
        toast.error("Sender missing required claims");
        return;
      }

      const recipientIdentity = await trexClient.getUserIdentity(recipient);
      if (!recipientIdentity?.onchainIdAddress) {
        setComplianceStatus({
          checked: true,
          allowed: false,
          reason: "Recipient does not have an OnChainID registered.",
        });
        toast.error("Recipient identity not registered");
        return;
      }

      if (!recipientIdentity?.isVerified) {
        setComplianceStatus({
          checked: true,
          allowed: false,
          reason:
            recipientIdentity?.verificationReason || "Recipient is not verified.",
        });
        toast.error("Recipient identity not verified");
        return;
      }

      if (!hasRequiredClaims(recipientIdentity, requiredTopics)) {
        setComplianceStatus({
          checked: true,
          allowed: false,
          reason: "Recipient is missing required compliance claims.",
        });
        toast.error("Recipient missing required claims");
        return;
      }

      const microAmount = parseTokenAmount(amount, tokenDecimals);
      const result = await trexClient.canTransfer(
        address,
        recipient,
        microAmount,
        tokenContract
      );

      setComplianceStatus({
        checked: true,
        allowed: result.allowed,
        reason: result.reason,
      });

      if (result.allowed) {
        toast.success("Transfer would be compliant!");
      } else {
        toast.error(`Transfer blocked: ${result.reason}`);
      }
    } catch (error: any) {
      console.error("Compliance check failed:", error);
      toast.error(error.message || "Failed to check compliance");
      setComplianceStatus({
        checked: true,
        allowed: false,
        reason: error.message || "Unknown error",
      });
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Execute the transfer
   */
  const handleTransfer = async () => {
    if (!trexClient || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!tokenContract) {
      toast.error("Please select a token first");
      return;
    }

    if (!complianceStatus?.allowed) {
      toast.error("Please run compliance check first");
      return;
    }

    setIsTransferring(true);

    try {
      const microAmount = parseTokenAmount(amount, tokenDecimals);

      // Use transferFromToken to target specific token contract
      const txHash = await trexClient.transferFromToken(
        tokenContract,
        recipient,
        microAmount
      );

      toast.success(
        <div>
          <p className="font-semibold">Transfer successful!</p>
          <p className="text-xs mt-1">TX: {txHash.slice(0, 16)}...</p>
        </div>
      );

      // Reset form
      setRecipient("");
      setAmount("");
      setComplianceStatus(null);

      // Callback
      onSuccess?.();
    } catch (error: any) {
      console.error("Transfer failed:", error);

      // Check for common identity verification errors
      const errorMsg = error.message || "";
      if (
        errorMsg.includes("Not verified") ||
        errorMsg.includes("wallet not registered")
      ) {
        toast.error(
          <div>
            <p className="font-semibold">Wallet Not Verified</p>
            <p className="text-xs mt-1">
              Your identity must be registered before transferring tokens.
              Please register in the Identity Manager section below.
            </p>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.error(error.message || "Transfer failed");
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const isFormValid = recipient && amount && parseFloat(amount) > 0;
  const canTransfer = complianceStatus?.allowed && isFormValid;

  return (
    <Card className="bg-white rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Transfer Tokens
        </CardTitle>
        <CardDescription>
          Send {tokenSymbol} tokens to another address with compliance
          verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No Token Selected Warning */}
        {!tokenContract && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Please select a token from the dropdown above to enable transfers
            </AlertDescription>
          </Alert>
        )}

        {/* Identity Verification Warning */}
        {tokenContract && !userIdentity && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Identity Not Registered</strong>
              <p className="text-xs mt-1">
                You must register your identity before transferring tokens.
                Scroll down to the Identity Manager section to register.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Balance Display */}
        {tokenContract && (
          <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatTokenAmount(userBalance, tokenDecimals)} {tokenSymbol}
            </p>
          </div>
        )}

        {/* Recipient Input */}
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="zig1..."
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setComplianceStatus(null); // Reset compliance when address changes
            }}
            disabled={isTransferring}
            className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
          />
          {recipient && !recipient.startsWith("zig1") && (
            <p className="text-xs text-destructive">Invalid address format</p>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setComplianceStatus(null); // Reset compliance when amount changes
              }}
              disabled={isTransferring}
              step="0.000001"
              min="0"
              className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
              onClick={() => {
                const maxAmount = formatTokenAmount(userBalance, tokenDecimals);
                setAmount(maxAmount);
                setComplianceStatus(null);
              }}
              disabled={isTransferring}
            >
              MAX
            </Button>
          </div>
          {amount &&
            (() => {
              try {
                const microAmount = parseTokenAmount(amount, tokenDecimals);
                const balanceMicro = BigInt(userBalance);
                const amountMicro = BigInt(microAmount);
                return amountMicro > balanceMicro;
              } catch {
                return false;
              }
            })() && (
              <p className="text-xs text-destructive">Insufficient balance</p>
            )}
        </div>

        {/* Compliance Status */}
        {complianceStatus && (
          <Alert
            variant={complianceStatus.allowed ? "default" : "destructive"}
            className={
              complianceStatus.allowed ? "border-green-200 bg-green-50" : ""
            }
          >
            {complianceStatus.allowed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {complianceStatus.allowed ? (
                <span className="text-green-700">
                  ✓ Transfer is compliant and ready to execute
                </span>
              ) : (
                <span>
                  <strong>Blocked:</strong> {complianceStatus.reason}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleComplianceCheck}
            disabled={!isFormValid || isChecking || isTransferring}
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Check Compliance
              </>
            )}
          </Button>

          <Button
            className="flex-1 bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6]"
            onClick={handleTransfer}
            disabled={!canTransfer || isTransferring}
          >
            {isTransferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Transfer
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-200">
          <p>• Transfers require compliance verification</p>
          <p>• Both sender and recipient must have verified identities</p>
          <p>• Required claims: KYC, AML from trusted issuers</p>
        </div>
      </CardContent>
    </Card>
  );
}
