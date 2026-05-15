"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/use-wallet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Globe,
  TrendingUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/backend";

interface ComplianceRulesManagerProps {
  onUpdate?: () => void;
}

// Common countries for compliance
const COMMON_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "UAE" },
  { code: "CH", name: "Switzerland" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
];

/**
 * Compliance Rules Manager
 *
 * Manages compliance rules for token transfers:
 * - Country restrictions (whitelist)
 * - Per-address transfer limits
 */
export function ComplianceRulesManager({
  onUpdate,
}: ComplianceRulesManagerProps) {
  const { trexClient, address } = useWallet();
  const [loading, setLoading] = useState(false);

  // Country restrictions state
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [allCountriesAllowed, setAllCountriesAllowed] = useState(true);

  // Transfer limit state
  const [limitAddress, setLimitAddress] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [countryReason, setCountryReason] = useState("");
  const [limitReason, setLimitReason] = useState("");

  const handleSetCountryRestrictions = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!countryReason.trim()) {
      toast.error("Reason required", {
        description: "Please provide a reason for this compliance change.",
      });
      return;
    }

    try {
      setLoading(true);
      toast.loading("Updating country restrictions...");

      const countries = allCountriesAllowed ? undefined : selectedCountries;
      const txHash = await trexClient.setAllowedCountries(countries);
      await apiFetch("/compliance-rules/countries", {
        method: "POST",
        body: JSON.stringify({
          allowedCountries: countries ?? [],
          reason: countryReason.trim(),
          txHash,
        }),
      });

      toast.dismiss();
      toast.success("Country restrictions updated", {
        description: `${
          allCountriesAllowed
            ? "All countries allowed"
            : `${selectedCountries.length} countries whitelisted`
        }. Tx: ${txHash.substring(0, 8)}...`,
      });

      onUpdate?.();
      setCountryReason("");
    } catch (error: any) {
      toast.dismiss();
      console.error("Set country restrictions failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error("Unauthorized", {
          description:
            "Only the compliance contract owner can set country restrictions",
        });
      } else {
        toast.error("Failed to update restrictions", {
          description: error.message || "Unknown error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetTransferLimit = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!limitAddress || !limitAddress.startsWith("zig1")) {
      toast.error("Invalid address", {
        description: "Please enter a valid address starting with zig1",
      });
      return;
    }

    if (limitEnabled && (!limitAmount || parseFloat(limitAmount) <= 0)) {
      toast.error("Invalid limit", {
        description: "Please enter a valid positive amount",
      });
      return;
    }
    if (!limitReason.trim()) {
      toast.error("Reason required", {
        description: "Please provide a reason for this compliance change.",
      });
      return;
    }

    try {
      setLoading(true);
      toast.loading("Setting transfer limit...");

      const limit = limitEnabled ? limitAmount : undefined;
      const txHash = await trexClient.setAddressTransferLimit(
        limitAddress,
        limit
      );
      await apiFetch("/compliance-rules/transfer-limits", {
        method: "POST",
        body: JSON.stringify({
          address: limitAddress,
          limit,
          reason: limitReason.trim(),
          txHash,
        }),
      });

      toast.dismiss();
      toast.success("Transfer limit set", {
        description: `Address ${limitAddress.substring(0, 12)}... ${
          limitEnabled ? `limit: ${limitAmount}` : "unlimited"
        }. Tx: ${txHash.substring(0, 8)}...`,
      });

      // Reset form
      setLimitAddress("");
      setLimitAmount("");
      setLimitEnabled(true);
      setLimitReason("");

      onUpdate?.();
    } catch (error: any) {
      toast.dismiss();
      console.error("Set transfer limit failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error("Unauthorized", {
          description:
            "Only the compliance contract owner can set transfer limits",
        });
      } else {
        toast.error("Failed to set limit", {
          description: error.message || "Unknown error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAllCountries = () => {
    setSelectedCountries(COMMON_COUNTRIES.map((c) => c.code));
  };

  const clearAllCountries = () => {
    setSelectedCountries([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-panel rounded-2xl border border-slate-200/70 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-[#2A5FA6]" />
            Compliance Rules
          </CardTitle>
          <CardDescription className="text-slate-600">
            Configure country restrictions and per-address transfer limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="countries" className="w-full">
            <TabsList className="w-fit grid grid-cols-2 p-1 rounded-xl h-auto bg-slate-100/70">
              <TabsTrigger
                value="countries"
                className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
              >
                Country Restrictions
              </TabsTrigger>
              <TabsTrigger
                value="limits"
                className="rounded-lg data-[state=active]:bg-gradient-to-tr data-[state=active]:from-[#172E7F] data-[state=active]:to-[#2A5FA6] data-[state=active]:text-white transition-all py-1.5 text-sm"
              >
                Transfer Limits
              </TabsTrigger>
            </TabsList>

            {/* Country Restrictions Tab */}
            <TabsContent value="countries" className="space-y-4">
              <Alert className="border-slate-200/70 bg-slate-50/80">
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Whitelist countries that are allowed to hold and transfer
                  tokens. If no countries are selected, all countries are
                  allowed.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allCountriesAllowed}
                      onChange={(e) => setAllCountriesAllowed(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Allow all countries (no restrictions)
                  </Label>
                </div>

                {!allCountriesAllowed && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllCountries}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearAllCountries}
                      >
                        Clear All
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto p-4 border border-slate-200/70 rounded-xl bg-white/70">
                      {COMMON_COUNTRIES.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => toggleCountry(country.code)}
                          className={`
                            p-3 rounded-lg border transition-all text-left
                            ${
                              selectedCountries.includes(country.code)
                                ? "bg-blue-50 border-blue-400/70"
                                : "bg-white/80 hover:bg-white border-slate-200/80"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            {selectedCountries.includes(country.code) ? (
                              <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            ) : (
                              <div className="h-4 w-4 border rounded-full border-slate-300" />
                            )}
                            <div>
                              <div className="font-medium text-sm">
                                {country.code}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {country.name}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedCountries.length > 0 && (
                      <Alert className="bg-blue-50/80 border-blue-200/70">
                        <Info className="h-4 w-4 text-blue-500" />
                        <AlertDescription>
                          <strong>
                            {selectedCountries.length} countries selected:
                          </strong>{" "}
                          {selectedCountries.join(", ")}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Globe className="mr-2 h-4 w-4" />
                          Apply Country Restrictions
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                    <DialogContent className="rounded-2xl border-slate-200/70">
                      <DialogHeader>
                        <DialogTitle>Confirm Country Restrictions</DialogTitle>
                    <DialogDescription>
                      This will update the compliance contract to enforce
                      country-based transfer restrictions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="country-reason">Reason (required)</Label>
                      <Input
                        id="country-reason"
                        value={countryReason}
                        onChange={(e) => setCountryReason(e.target.value)}
                        placeholder="e.g. Updated regulatory guidance"
                        className="bg-white/80 border-slate-200/70 focus:bg-white"
                        disabled={loading}
                      />
                    </div>
                    {allCountriesAllowed ? (
                      <Alert className="bg-green-50/80 border-green-200/70">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <AlertDescription>
                            <strong>All countries allowed</strong> - No
                            restrictions will be enforced
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Alert className="bg-blue-50/80 border-blue-200/70">
                            <Info className="h-4 w-4 text-blue-500" />
                            <AlertDescription>
                              <strong>Whitelist mode:</strong> Only{" "}
                              {selectedCountries.length} countries will be
                              allowed
                            </AlertDescription>
                          </Alert>
                          <div className="max-h-50 overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                              {selectedCountries.map((code) => (
                                <Badge key={code} variant="secondary">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      <Alert variant="destructive" className="border-red-200/70 bg-red-50/80">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Warning:</strong> Users from restricted
                          countries will not be able to receive or transfer
                          tokens.
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleSetCountryRestrictions}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          "Confirm & Apply"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            {/* Transfer Limits Tab */}
            <TabsContent value="limits" className="space-y-4">
              <Alert className="border-slate-200/70 bg-slate-50/80">
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Set per-address transfer limits to restrict the maximum amount
                  an address can transfer per transaction.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="limit-address">Wallet Address</Label>
                  <Input
                    id="limit-address"
                    value={limitAddress}
                    onChange={(e) => setLimitAddress(e.target.value)}
                    placeholder="zig1..."
                    disabled={loading}
                    className="bg-white/80 border-slate-200/70 focus:bg-white transition-colors h-11"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={limitEnabled}
                      onChange={(e) => setLimitEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Enable transfer limit
                  </Label>
                </div>

                {limitEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="limit-amount">
                      Maximum Transfer Amount
                    </Label>
                    <Input
                      id="limit-amount"
                      type="number"
                      value={limitAmount}
                      onChange={(e) => setLimitAmount(e.target.value)}
                      placeholder="1000000"
                      disabled={loading}
                      className="bg-white/80 border-slate-200/70 focus:bg-white transition-colors h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter amount in smallest unit (e.g., 1000000 = 1 token
                      with 6 decimals)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="limit-reason">Reason (required)</Label>
                  <Input
                    id="limit-reason"
                    value={limitReason}
                    onChange={(e) => setLimitReason(e.target.value)}
                    placeholder="e.g. Risk control threshold"
                    disabled={loading}
                    className="bg-white/80 border-slate-200/70 focus:bg-white transition-colors h-11"
                  />
                </div>

                {!limitEnabled && (
                  <Alert className="bg-amber-50/80 border-amber-200/70">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription>
                      Disabling the limit will allow unlimited transfers for
                      this address
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSetTransferLimit}
                  disabled={loading || !limitAddress}
                  className="w-full bg-linear-to-tr from-[#172E7F] to-[#2A5FA6] hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {limitEnabled
                        ? "Set Transfer Limit"
                        : "Remove Transfer Limit"}
                    </>
                  )}
                </Button>

                <Alert className="bg-blue-50/80 border-blue-200/70">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription>
                    <strong>Note:</strong> Transfer limits are enforced by the
                    compliance contract during each transfer attempt. The limit
                    applies to the sending address.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
