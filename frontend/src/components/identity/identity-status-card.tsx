'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, ExternalLink, Shield } from 'lucide-react';
import { UserIdentity } from '@/hooks/use-identity';

interface IdentityStatusCardProps {
  identity: UserIdentity | null;
  loading: boolean;
  onCreateOnchainId: () => void;
  onRegisterIdentity: () => void;
}

export function IdentityStatusCard({
  identity,
  loading,
  onCreateOnchainId,
  onRegisterIdentity,
}: IdentityStatusCardProps) {
  const getStatusIcon = () => {
    if (loading) return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
    if (identity?.isVerified) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (identity?.onchainIdAddress) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (identity?.isVerified) return 'Verified';
    if (identity?.onchainIdAddress && !identity?.country) return 'OnchainID Created - Register Required';
    if (identity?.onchainIdAddress) return 'Pending Verification';
    return 'Not Verified';
  };

  const getStatusBadge = () => {
    if (loading) return <Badge variant="outline">Checking...</Badge>;
    if (identity?.isVerified) return <Badge className="bg-green-500"> Verified</Badge>;
    if (identity?.onchainIdAddress) return <Badge className="bg-yellow-500">⏳ Pending</Badge>;
    return <Badge variant="destructive">❌ Not Verified</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Identity Status</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Your verification status for compliant token trading
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">Wallet</p>
          <p className="text-sm font-mono">{identity?.wallet || 'Not connected'}</p>
        </div>

        {/* OnchainID Address */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">OnchainID</p>
          {identity?.onchainIdAddress ? (
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono">{identity.onchainIdAddress}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://testnet.ping.pub/zigchain/account/${identity.onchainIdAddress}`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onCreateOnchainId}
              disabled={loading}
            >
              Create OnchainID
            </Button>
          )}
        </div>

        {/* Country */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">Country</p>
          {identity?.country ? (
            <p className="text-sm">{identity.country}</p>
          ) : identity?.onchainIdAddress ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Not registered</p>
              <Button
                size="sm"
                onClick={onRegisterIdentity}
                disabled={loading}
              >
                Register Identity
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Create OnchainID first</p>
          )}
        </div>

        {/* Verification Status */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">Verification</p>
          <div className="flex items-center gap-2 mt-1">
            {getStatusIcon()}
            <p className="text-sm">{getStatusText()}</p>
          </div>
          {identity?.verificationReason && (
            <p className="text-xs text-muted-foreground mt-1">{identity.verificationReason}</p>
          )}
        </div>

        {/* Action Buttons */}
        {!identity?.isVerified && identity?.onchainIdAddress && identity?.country && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Waiting for admin to add KYC claims
            </p>
            <p className="text-xs text-muted-foreground">
              Once approved, you'll be able to trade security tokens
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
