/**
 * Batch KYC Operations Component
 * Allows agents to approve/revoke KYC for multiple users via CSV upload
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
import { Label } from "@/components/ui/label";
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
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface BatchKYCUpdate {
  address: string;
  status: "Approved" | "Revoked" | "Pending";
}

interface BatchKYCOpsProps {
  tokenContract?: string;
  onUpdate?: () => void;
}

export function BatchKYCOps({ tokenContract, onUpdate }: BatchKYCOpsProps) {
  const { trexClient } = useWallet();
  const [updates, setUpdates] = useState<BatchKYCUpdate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes("address") ? 1 : 0;

        const parsed: BatchKYCUpdate[] = [];
        for (let i = startIndex; i < lines.length; i++) {
          const [address, status] = lines[i].split(",").map((s) => s.trim());

          if (!address || !address.startsWith("zig1")) {
            toast.error(`Invalid address at line ${i + 1}: ${address}`);
            continue;
          }

          const kycStatus = status as "Approved" | "Revoked" | "Pending";
          if (!["Approved", "Revoked", "Pending"].includes(kycStatus)) {
            toast.error(
              `Invalid status at line ${
                i + 1
              }: ${status}. Must be Approved, Revoked, or Pending`
            );
            continue;
          }

          parsed.push({ address, status: kycStatus });
        }

        if (parsed.length === 0) {
          toast.error("No valid entries found in CSV");
          return;
        }

        setUpdates(parsed);
        toast.success(`Loaded ${parsed.length} KYC updates from CSV`);
      } catch (error) {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file");
      }
    };

    reader.readAsText(file);
    event.target.value = ""; // Reset input
  };

  const handleProcessBatch = async () => {
    if (!trexClient || !tokenContract) {
      toast.error("Please connect your wallet and select a token first");
      return;
    }

    if (updates.length === 0) {
      toast.error("No updates to process");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading(
      `Processing ${updates.length} KYC updates...`
    );

    try {
      const txHash = await trexClient.batchSetKyc(updates, tokenContract);

      toast.success(
        <div>
          <p className="font-semibold">Batch KYC update successful!</p>
          <p className="text-xs mt-1">{updates.length} addresses updated</p>
          <p className="text-xs text-muted-foreground">
            TX: {txHash.slice(0, 16)}...
          </p>
        </div>,
        { id: loadingToast, duration: 6000 }
      );

      setUpdates([]);
      onUpdate?.();
    } catch (error: any) {
      console.error("Batch KYC failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error(
          <div>
            <p className="font-semibold">Authorization Failed</p>
            <p className="text-xs mt-1">
              Only agents or the token owner can perform batch KYC operations.
            </p>
          </div>,
          { id: loadingToast, duration: 6000 }
        );
      } else {
        toast.error(error.message || "Failed to process batch KYC", {
          id: loadingToast,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csv =
      "address,status\nzig1example1address...,Approved\nzig1example2address...,Revoked\nzig1example3address...,Pending";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch_kyc_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-6 w-6" />
          Batch KYC Operations
        </CardTitle>
        <CardDescription>
          Upload a CSV file to approve or revoke KYC status for multiple
          addresses at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert
          variant="default"
          className="border-blue-100 bg-blue-50/50 rounded-xl"
        >
          <AlertCircle className="h-4 w-4 text-[#172E7F]" />
          <AlertTitle className="text-[#172E7F]">CSV Format</AlertTitle>
          <AlertDescription className="text-blue-700 text-sm space-y-2">
            <p>
              Your CSV file should have two columns:{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-xs">
                address
              </code>{" "}
              and{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-xs">
                status
              </code>
            </p>
            <p className="text-xs opacity-90">
              Status must be one of: <strong>Approved</strong>,{" "}
              <strong>Revoked</strong>, or <strong>Pending</strong>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="mt-2 bg-white border-blue-200 hover:bg-blue-100 hover:text-blue-800 h-8"
            >
              <Download className="h-3 w-3 mr-1" />
              Download Template
            </Button>
          </AlertDescription>
        </Alert>

        {!tokenContract && (
          <Alert className="rounded-xl bg-orange-50 border-orange-100">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              Please select a token from the dropdown above to enable batch KYC
              operations
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-upload" className="mb-2 block">
              Upload CSV File
            </Label>
            <div
              className={`mt-2 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                !tokenContract
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                  : "border-gray-300 hover:border-[#172E7F] hover:bg-blue-50/30 cursor-pointer"
              }`}
            >
              <Upload
                className={`h-8 w-8 mx-auto mb-3 ${
                  !tokenContract ? "text-gray-300" : "text-gray-400"
                }`}
              />
              <div className="relative">
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={!tokenContract || isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="space-y-1">
                  <p
                    className={`text-sm font-medium ${
                      !tokenContract ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV file (max 5MB)
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Format: address,status (one entry per line)
            </p>
          </div>

          {updates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Preview ({updates.length} updates)
                </h3>
                <Button
                  onClick={handleProcessBatch}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Process {updates.length} Updates
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updates.map((update, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {update.address}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              update.status === "Approved"
                                ? "default"
                                : update.status === "Revoked"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {update.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          ⚠️ Only agents and the token owner can perform batch KYC operations.
          All addresses will be updated in a single transaction.
        </p>
      </CardContent>
    </Card>
  );
}
