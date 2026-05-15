'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Coins } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import { toast } from 'sonner';

interface IssueMoreTokensProps {
  assetId: number;
  assetName: string;
  currentTokenized: number;
  underlyingValue: number;
  onSuccess?: () => void;
}

export function IssueMoreTokens({
  assetId,
  assetName,
  currentTokenized,
  underlyingValue,
  onSuccess,
}: IssueMoreTokensProps) {
  const { trexClient, address } = useWallet();
  const [recipient, setRecipient] = useState(address || '');
  const [amount, setAmount] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);

  const handleIssue = async () => {
    if (!trexClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!recipient || !amount) {
      toast.error('Please enter recipient and amount');
      return;
    }

    setIsIssuing(true);
    const loadingToast = toast.loading(`Issuing tokens for ${assetName}...`);

    try {
      // Step 1: Create issuance request
      const issueResult = await trexClient.issueAsset(
        assetId,
        recipient,
        amount
      );

      if (!issueResult.requestId) {
        throw new Error('Failed to extract request ID from transaction');
      }

      // requestId is a number from the interface
      const requestId = typeof issueResult.requestId === 'string' 
        ? parseInt(issueResult.requestId) 
        : issueResult.requestId;
      
      toast.loading('Approving issuance...', { id: loadingToast });

      // Step 2: Approve the issuance (mints tokens and updates asset.total_tokenized)
      const approveHash = await trexClient.approveIssue(requestId);

      toast.success(
        <div>
          <p className="font-semibold">Tokens issued for {assetName}!</p>
          <p className="text-xs mt-1">TX: {approveHash.slice(0, 16)}...</p>
        </div>,
        { id: loadingToast }
      );

      setAmount('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Issue failed:', error);
      toast.error(error.message || 'Failed to issue tokens', { id: loadingToast });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Issue More Tokens for Asset
        </CardTitle>
        <CardDescription>
          Mint additional tokens specifically for this asset (updates tokenization tracking)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Asset-Specific Token Issuance</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            This is different from generic minting. These tokens will be tracked as part of
            Asset #{assetId} and will update the asset's <code className="px-1 py-0.5 bg-muted rounded">total_tokenized</code> counter.
          </AlertDescription>
        </Alert>

        {/* Current Stats */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/50">
          <div>
            <p className="text-sm font-medium">Asset ID</p>
            <p className="text-2xl font-bold">#{assetId}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Current Tokenized</p>
            <p className="text-2xl font-bold">{currentTokenized.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Asset Name</p>
            <p className="text-lg">{assetName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Underlying Value</p>
            <p className="text-lg">${underlyingValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="zig1..."
              disabled={isIssuing}
            />
            <p className="text-xs text-muted-foreground">
              Address must be verified in Identity Registry
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (raw units, 6 decimals)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000"
              disabled={isIssuing}
              min="1"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Enter raw amount (e.g., 1000000 = 1.00 token)</span>
              {amount && (
                <span className="font-medium">
                  = {(parseInt(amount) / 1000000).toFixed(2)} tokens
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={handleIssue}
            disabled={isIssuing || !recipient || !amount}
            className="w-full"
            size="lg"
          >
            {isIssuing ? 'Issuing...' : 'Issue Tokens for This Asset'}
          </Button>
        </div>

        {/* Explanation Box */}
        <div className="p-4 rounded-lg border bg-muted/30 text-sm space-y-2">
          <p className="font-medium">What happens when you issue:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Creates an issuance request for asset #{assetId}</li>
            <li>Auto-approves and mints RWASEC tokens to recipient</li>
            <li>Updates asset's <code className="px-1 py-0.5 bg-muted rounded">total_tokenized</code> counter</li>
            <li>Increases total token supply</li>
            <li>Triggers compliance validation</li>
            <li>Tokens are tied to this specific asset</li>
          </ul>
        </div>

        {/* Difference Explanation */}
        <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-sm">
          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Asset Issuance vs Generic Mint
          </p>
          <div className="space-y-1 text-blue-800 dark:text-blue-200 text-xs">
            <p><strong>Asset Issuance</strong> (this button):</p>
            <ul className="list-disc list-inside ml-2 mb-2">
              <li>Mints tokens FOR this specific asset</li>
              <li>Updates asset.total_tokenized</li>
              <li>Tracks which asset tokens represent</li>
            </ul>
            <p><strong>Generic Mint</strong> (/transfer → Admin → Mint):</p>
            <ul className="list-disc list-inside ml-2">
              <li>Mints generic RWASEC tokens</li>
              <li>NOT tied to any specific asset</li>
              <li>Does NOT update any asset stats</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
