"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useIdentity } from "@/hooks/use-identity";
import { KycApplicationForm } from "@/components/identity/kyc-application-form";
import { ClaimsCard } from "@/components/identity/claims-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";
import {
  getKycApplicationByWallet,
  type KycApplication,
} from "@/lib/kyc-api";

export default function IdentityPage() {
  const { address, connectKeplr, isConnected } = useWallet();
  const {
    identity,
    loading,
    error,
    loadIdentity,
    hasOnchainId,
    isVerified,
    claims,
  } = useIdentity();

  const [kycApplication, setKycApplication] = useState<KycApplication | null>(
    null
  );

  const applicationStatus = kycApplication?.status ?? "NOT_STARTED";
  const applicationStatusLabel =
    applicationStatus === "PENDING"
      ? "Under Review"
      : applicationStatus === "UNDER_REVIEW"
      ? "Under Review"
      : applicationStatus === "APPROVED"
      ? "Approved"
      : applicationStatus === "REJECTED"
      ? "Needs Resubmission"
      : "Not Submitted";
  const applicationStatusDescription =
    applicationStatus === "PENDING"
      ? "Your application is being reviewed by a KYC provider."
      : applicationStatus === "UNDER_REVIEW"
      ? "Your application is being reviewed by a KYC provider."
      : applicationStatus === "APPROVED"
      ? "KYC approved. Claims and registry are being finalized."
      : applicationStatus === "REJECTED"
      ? "Review feedback is available. Please resubmit."
      : "Start your KYC application to unlock trading.";
  const currentStep =
    applicationStatus === "APPROVED" || hasOnchainId || isVerified
      ? 3
      : applicationStatus === "PENDING" || applicationStatus === "UNDER_REVIEW"
      ? 2
      : 1;

  // Load KYC application from localStorage
  useEffect(() => {
    const loadKyc = async () => {
      if (!address) return;
      const app = await getKycApplicationByWallet(address);
      setKycApplication(app);
    };
    loadKyc();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Investor KYC</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to start your verification journey
          </p>
          <Button
            onClick={connectKeplr}
            size="lg"
            className="bg-linear-to-tr from-[#172E7F] to-[#2A5FA6]"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 glass-panel rounded-[22px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-linear-to-tr from-[#172E7F] to-[#2A5FA6]">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Investor KYC</h1>
              <p className="text-sm text-gray-600">
                One guided flow to verify your identity and unlock trading
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadIdentity} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card
          className={`rounded-2xl border ${
            currentStep >= 1
              ? "border-blue-200 bg-blue-50/60 shadow-sm"
              : "bg-white"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Step 1</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">Submit KYC</div>
            <p className="text-xs text-muted-foreground mt-1">
              Provide your identity details and documents.
            </p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl border ${
            currentStep >= 2
              ? "border-blue-200 bg-blue-50/60 shadow-sm"
              : "bg-white"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Step 2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">KYC Review</div>
            <p className="text-xs text-muted-foreground mt-1">
              A trusted provider validates your submission.
            </p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl border ${
            currentStep >= 3
              ? "border-blue-200 bg-blue-50/60 shadow-sm"
              : "bg-white"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Step 3</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">OnChainID & Claims</div>
            <p className="text-xs text-muted-foreground mt-1">
              Your OnChainID and KYC claims are created.
            </p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl border ${
            isVerified
              ? "border-green-200 bg-green-50/60 shadow-sm"
              : "bg-white"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Step 4</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">Trade Enabled</div>
            <p className="text-xs text-muted-foreground mt-1">
              You can hold and transfer compliant assets.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {[
            { label: "Submit KYC", step: 1 },
            { label: "KYC Review", step: 2 },
            { label: "OnChainID & Claims", step: 3 },
            { label: "Trade Enabled", step: 4 },
          ].map((item, index, arr) => {
            const isActive =
              item.step === 4 ? isVerified : currentStep >= item.step;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-500 border border-slate-200"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-[0.18em]">
                    Step {item.step}
                  </span>
                  <span>{item.label}</span>
                </div>
                {index < arr.length - 1 && (
                  <span className="h-px w-8 bg-blue-200" />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-blue-700">
          You are currently in{" "}
          <span className="font-semibold">{applicationStatusLabel}</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Application Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{applicationStatusLabel}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {applicationStatusDescription}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">OnChainID</CardTitle>
          </CardHeader>
          <CardContent>
            {hasOnchainId && identity?.onchainIdAddress ? (
              <div className="space-y-2">
                <p className="text-sm font-mono text-slate-700">
                  {identity.onchainIdAddress.slice(0, 24)}...
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `https://testnet.ping.pub/zigchain/account/${identity.onchainIdAddress}`,
                      "_blank"
                    )
                  }
                >
                  View on explorer
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                OnChainID will be created by the KYC provider after review.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Verification</CardTitle>
          </CardHeader>
          <CardContent>
            {isVerified ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold">Verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-semibold">Pending</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {identity?.verificationReason || "Awaiting trusted issuer claims."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {applicationStatus === "REJECTED" && (
        <Alert className="mb-6 border-red-200 bg-red-50 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900">Action Required</AlertTitle>
          <AlertDescription className="text-red-700">
            {kycApplication?.rejectionReason ||
              "Your submission needs updates. Please resubmit with corrected information."}
          </AlertDescription>
        </Alert>
      )}

      {applicationStatus === "APPROVED" && !isVerified && (
        <Alert className="mb-6 border-blue-200 bg-blue-50 rounded-xl">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">KYC Approved</AlertTitle>
          <AlertDescription className="text-blue-700">
            Your KYC is approved. We are finalizing OnChainID claims and
            registry registration. Refresh to see updates.
          </AlertDescription>
        </Alert>
      )}

      {isVerified && (
        <Alert className="mb-6 border-green-200 bg-green-50 rounded-xl">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Fully Verified</AlertTitle>
          <AlertDescription className="text-green-700">
            Your identity is fully verified. You can now trade security tokens
            on this platform.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Column: KYC Application or Identity Status */}
        <div className="space-y-4">
          {/* KYC Application Form */}
          {address && !isVerified && kycApplication?.status !== "APPROVED" && (
            <KycApplicationForm
              walletAddress={address}
              existingApplication={kycApplication}
            />
          )}

          {/* Application Details */}
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg">Application Details</CardTitle>
              <CardDescription>
                Track your submission timeline and next steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    applicationStatus === "APPROVED"
                      ? "default"
                      : applicationStatus === "REJECTED"
                      ? "destructive"
                      : applicationStatus === "PENDING" ||
                        applicationStatus === "UNDER_REVIEW"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {applicationStatusLabel}
                </Badge>
              </div>

              {kycApplication ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="text-xs text-slate-700">
                      {new Date(kycApplication.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  {kycApplication.reviewedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Reviewed</span>
                      <span className="text-xs text-slate-700">
                        {new Date(kycApplication.reviewedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {kycApplication.reviewedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Reviewer</span>
                      <span className="text-xs font-mono text-slate-700">
                        {kycApplication.reviewedBy.slice(0, 12)}...
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No submission yet. Start your KYC application to begin.
                </p>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Next steps: A trusted provider verifies your documents, creates
                an OnChainID, and adds KYC claims. The registry owner registers
                you before trading is enabled.
              </div>

              <Button
                variant="link"
                className="p-0 h-auto text-xs"
                onClick={() =>
                  window.open(
                    "https://github.com/TokenySolutions/T-REX",
                    "_blank"
                  )
                }
              >
                Learn more about T-REX Standard
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Claims (only show if has OnchainID) */}
        <div>
          {hasOnchainId && identity?.onchainIdAddress ? (
            <ClaimsCard
              claims={claims}
              loading={loading}
              onAddClaim={async (topic: number, data: string, uri: string) => {
                // Investors cannot add claims - return empty promise
                return Promise.resolve("");
              }}
              canAddClaims={false}
            />
          ) : (
            <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Verification Claims
                </CardTitle>
                <CardDescription>
                  Your verification status will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">
                    Complete KYC verification to see your claims
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
