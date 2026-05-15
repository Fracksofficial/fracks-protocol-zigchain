/**
 * Required Topics Manager Component
 * Allows admins to view and update which claim topics are required for investor verification
 * Integrates with Claim Topics Registry (CTR) contract
 */

"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// Topic definitions - matches investor-claims-manager.tsx for consistency
const CLAIM_TOPICS = [
  { id: 1, name: "KYC", description: "Know Your Customer verification" },
  { id: 2, name: "AML", description: "Anti-Money Laundering check" },
  {
    id: 3,
    name: "Accredited Investor",
    description: "SEC accredited investor status",
  },
  {
    id: 4,
    name: "Qualified Purchaser",
    description: "Qualified purchaser status",
  },
  { id: 5, name: "Institutional", description: "Institutional investor" },
  { id: 6, name: "Retail", description: "Retail investor" },
  { id: 7, name: "Sanctions Check", description: "Sanctions screening passed" },
  { id: 8, name: "Tax Status", description: "Tax documentation verified" },
  { id: 9, name: "Credit Check", description: "Credit verification" },
  { id: 10, name: "Custom", description: "Custom claim type" },
];

interface RequiredTopicsManagerProps {
  onUpdate?: () => void;
}

export function RequiredTopicsManager({
  onUpdate,
}: RequiredTopicsManagerProps) {
  const { trexClient } = useWallet();
  const [requiredTopics, setRequiredTopics] = useState<number[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current required topics from contract
  const loadRequiredTopics = async () => {
    if (!trexClient) return;

    setLoading(true);
    try {
      const response = await trexClient.getRequiredTopics();
      const topics = response.topics || [];
      setRequiredTopics(topics);
      setSelectedTopics(topics);
      setHasChanges(false);
    } catch (error: any) {
      console.error("Failed to load required topics:", error);
      toast.error("Failed to load required topics", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequiredTopics();
  }, [trexClient]);

  // Check if selection differs from contract state
  useEffect(() => {
    const changed =
      selectedTopics.length !== requiredTopics.length ||
      selectedTopics.some((t) => !requiredTopics.includes(t)) ||
      requiredTopics.some((t) => !selectedTopics.includes(t));
    setHasChanges(changed);
  }, [selectedTopics, requiredTopics]);

  // Toggle topic selection
  const handleToggleTopic = (topicId: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : [...prev, topicId].sort((a, b) => a - b)
    );
  };

  // Save changes to contract
  const handleSave = async () => {
    if (!trexClient) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (selectedTopics.length === 0) {
      toast.error("At least one topic must be required", {
        description: "Select topics that investors must have to be verified",
      });
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Updating required topics...");

    try {
      const txHash = await trexClient.setRequiredTopics(selectedTopics);

      toast.success("Required topics updated!", {
        id: loadingToast,
        description: `Topics: ${selectedTopics.join(", ")} - TX: ${txHash.slice(
          0,
          16
        )}...`,
      });

      // Reload to confirm
      await loadRequiredTopics();
      onUpdate?.();
    } catch (error: any) {
      console.error("Save failed:", error);

      if (error.message?.includes("Unauthorized")) {
        toast.error("Authorization Failed", {
          id: loadingToast,
          description: "Only the CTR contract owner can update required topics",
        });
      } else {
        toast.error("Failed to update required topics", {
          id: loadingToast,
          description: error.message,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Reset to contract state
  const handleReset = () => {
    setSelectedTopics(requiredTopics);
    toast.info("Changes discarded");
  };

  return (
    <Card className="bg-white rounded-2xl shadow-sm border-0">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Required Topics Configuration
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              Set which claim topics investors MUST have to be verified
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Info Alert */}
        <Alert className="border-blue-100 bg-blue-50/50 rounded-xl">
          <Info className="h-4 w-4 text-[#172E7F]" />
          <AlertTitle className="text-[#172E7F] font-semibold">
            How Required Topics Work
          </AlertTitle>
          <AlertDescription className="text-sm text-blue-700/80 mt-1">
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>
                Investors must have ALL selected topics in their OnChainID
              </li>
              <li>
                Changes take effect immediately for all future verifications
              </li>
              <li>Typically: KYC (Topic 1) and AML (Topic 2) are required</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Current Status */}
        {!loading && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <Label className="text-sm font-semibold text-gray-900">
                Active Requirements (On-Chain)
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {requiredTopics.length > 0 ? (
                requiredTopics.map((topicId) => {
                  const topic = CLAIM_TOPICS.find((t) => t.id === topicId);
                  return (
                    <Badge
                      key={topicId}
                      className="bg-green-100 text-green-700 hover:bg-green-200 border-0 px-2.5 py-1"
                    >
                      {topic?.name || `Topic ${topicId}`}
                    </Badge>
                  );
                })
              ) : (
                <Badge variant="secondary" className="px-3 py-1">
                  No topics required
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Topic Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold text-gray-900">
              Select Required Topics
              {hasChanges && (
                <span className="ml-2 text-sm font-normal text-amber-600 animate-pulse">
                  (Modified - Save to apply)
                </span>
              )}
            </Label>
            {hasChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-gray-500 hover:text-gray-900"
              >
                Reset Changes
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
              <span className="text-sm">Syncing with blockchain...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CLAIM_TOPICS.map((topic) => {
                const isSelected = selectedTopics.includes(topic.id);

                return (
                  <div
                    key={topic.id}
                    onClick={() => handleToggleTopic(topic.id)}
                    className={`cursor-pointer group flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-50/50 border-blue-200 shadow-sm"
                        : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <Checkbox
                      id={`topic-${topic.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleToggleTopic(topic.id)}
                      className={`mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-gray-300`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-medium ${
                            isSelected ? "text-blue-900" : "text-gray-700"
                          }`}
                        >
                          {topic.name}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          #{topic.id}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isSelected ? "text-blue-700/80" : "text-gray-500"
                        }`}
                      >
                        {topic.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving || loading}
            className="flex-1 bg-gradient-to-r from-[#172E7F] to-[#2A5FA6] hover:from-[#122466] hover:to-[#214c85] text-white shadow-md transition-all rounded-xl py-6"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating Contract...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={loadRequiredTopics}
            disabled={loading || saving}
            className="rounded-xl py-6 px-4 border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Label({ children, className = "", ...props }: any) {
  return (
    <label
      className={`text-sm font-medium leading-none ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
