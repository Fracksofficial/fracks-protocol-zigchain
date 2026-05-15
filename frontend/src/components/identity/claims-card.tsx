"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";
import { IdentityClaim } from "@/hooks/use-identity";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClaimsCardProps {
  claims: IdentityClaim[];
  loading: boolean;
  onAddClaim: (topic: number, data: string, uri: string) => Promise<string>;
  canAddClaims?: boolean; // Only admins/issuers can add claims
}

export function ClaimsCard({
  claims,
  loading,
  onAddClaim,
  canAddClaims = false,
}: ClaimsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClaim, setNewClaim] = useState({
    topic: 1,
    data: "",
    uri: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleAddClaim = async () => {
    setSubmitting(true);
    try {
      await onAddClaim(newClaim.topic, newClaim.data, newClaim.uri);
      setDialogOpen(false);
      setNewClaim({ topic: 1, data: "", uri: "" });
    } catch (error) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getClaimIcon = (claim: IdentityClaim) => {
    if (claim.revoked) return <XCircle className="h-4 w-4 text-red-500" />;
    if (claim.expiresAt && claim.expiresAt < Date.now() / 1000) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getClaimStatus = (claim: IdentityClaim) => {
    if (claim.revoked) return <Badge variant="destructive">Revoked</Badge>;
    if (claim.expiresAt && claim.expiresAt < Date.now() / 1000) {
      return <Badge className="bg-yellow-500">Expired</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  return (
    <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verification Claims</CardTitle>
            <CardDescription>
              Your KYC, AML, and accreditation status
            </CardDescription>
          </div>
          {canAddClaims && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Claim
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Verification Claim</DialogTitle>
                  <DialogDescription>
                    Add a new claim to this identity (issuer only)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Claim Type</Label>
                    <Select
                      value={newClaim.topic.toString()}
                      onValueChange={(value) =>
                        setNewClaim({ ...newClaim, topic: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">KYC Verified</SelectItem>
                        <SelectItem value="2">AML Checked</SelectItem>
                        <SelectItem value="3">Accredited Investor</SelectItem>
                        <SelectItem value="4">Country Approved</SelectItem>
                        <SelectItem value="5">Age Verified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Claim Data</Label>
                    <Input
                      placeholder="e.g., KYC_VERIFIED_2025"
                      value={newClaim.data}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, data: e.target.value })
                      }
                      className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                    />
                  </div>
                  <div>
                    <Label>Proof URI (optional)</Label>
                    <Input
                      placeholder="https://kyc-provider.com/proof"
                      value={newClaim.uri}
                      onChange={(e) =>
                        setNewClaim({ ...newClaim, uri: e.target.value })
                      }
                      className="bg-gray-50 border-gray-200 focus:bg-white transition-colors h-11"
                    />
                  </div>
                  <Button
                    className="w-full bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity text-white"
                    onClick={handleAddClaim}
                    disabled={submitting || !newClaim.data}
                  >
                    {submitting ? "Adding Claim..." : "Add Claim"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading claims...
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No verification claims yet</p>
            <p className="text-xs mt-1">
              Complete KYC to receive verification claims
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-start justify-between p-4 border rounded-xl bg-white border-gray-100 shadow-sm transition-all hover:bg-gray-50/50"
              >
                <div className="flex items-start gap-3">
                  {getClaimIcon(claim)}
                  <div>
                    <p className="font-medium">{claim.topicName}</p>
                    <p className="text-xs text-muted-foreground">
                      Issuer: {claim.issuer.slice(0, 20)}...
                    </p>
                    {claim.data && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Data: {claim.data}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Issued: {formatDate(claim.issuedAt)}
                    </p>
                    {claim.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {formatDate(claim.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div>{getClaimStatus(claim)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
