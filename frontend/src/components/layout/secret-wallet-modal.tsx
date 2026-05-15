"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { TREX_CONTRACTS, ROLE_WALLETS } from "@/lib/zigchain-config";
import { useWallet } from "@/hooks/use-wallet";

type RoleEntry = {
  label: string;
  address: string;
  role: string;
  source: "config" | "onchain";
};

const RESET_MS = 1200;

export function SecretWalletModal() {
  const { trexClient } = useWallet();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [comboStage, setComboStage] = useState<0 | 1>(0);
  const [lastKeyTime, setLastKeyTime] = useState<number>(0);

  const staticRoles = useMemo<RoleEntry[]>(() => {
    const makeEntry = (
      entry: Omit<RoleEntry, "address"> & { address?: string | null }
    ) => {
      if (!entry.address) return null;
      return { ...entry, address: entry.address };
    };

    const entries = [
      makeEntry({
        label: "Platform Owner",
        address: ROLE_WALLETS.platformOwner,
        role: "platform_owner",
        source: "config",
      }),
      makeEntry({
        label: "KYC Issuer",
        address: ROLE_WALLETS.kycIssuer,
        role: "kyc_issuer",
        source: "config",
      }),
      makeEntry({
        label: "Fund Real Estate",
        address: ROLE_WALLETS.fundRealEstate,
        role: "fund_issuer",
        source: "config",
      }),
      makeEntry({
        label: "Fund Stocks",
        address: ROLE_WALLETS.fundStocks,
        role: "fund_issuer",
        source: "config",
      }),
      makeEntry({
        label: "Identity Registry",
        address: TREX_CONTRACTS.identityRegistry,
        role: "contract",
        source: "config",
      }),
      makeEntry({
        label: "Trusted Issuers Registry",
        address: TREX_CONTRACTS.trustedIssuers,
        role: "contract",
        source: "config",
      }),
      makeEntry({
        label: "Claim Topics Registry",
        address: TREX_CONTRACTS.claimTopics,
        role: "contract",
        source: "config",
      }),
      makeEntry({
        label: "Compliance Contract",
        address: TREX_CONTRACTS.compliance,
        role: "contract",
        source: "config",
      }),
      makeEntry({
        label: "Factory Contract",
        address: TREX_CONTRACTS.factory,
        role: "contract",
        source: "config",
      }),
    ];

    return entries.filter((entry): entry is RoleEntry => !!entry);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      if (!(event.ctrlKey && event.shiftKey && event.altKey)) {
        setComboStage(0);
        return;
      }

      const key = event.key.toLowerCase();
      const now = Date.now();

      if (lastKeyTime && now - lastKeyTime > RESET_MS) {
        setComboStage(0);
      }
      setLastKeyTime(now);

      if (comboStage === 0 && key === "k") {
        setComboStage(1);
        return;
      }

      if (comboStage === 1 && key === "w") {
        setOpen(true);
        setComboStage(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [comboStage, lastKeyTime]);

  useEffect(() => {
    if (!open || !trexClient) return;

    const loadRoles = async () => {
      setLoading(true);
      try {
        const [
          factoryConfig,
          identityConfig,
          claimTopicsOwner,
          complianceConfig,
          tirOwner,
          rolesForDefault,
        ] = await Promise.all([
          trexClient.getFactoryConfig().catch(() => null),
          trexClient.getIdentityRegistryConfig().catch(() => null),
          trexClient.getClaimTopicsOwner().catch(() => null),
          trexClient.getComplianceConfig().catch(() => null),
          trexClient.getTirOwner().catch(() => null),
          trexClient.getRoles().catch(() => null),
        ]);

        const onchainRoles: RoleEntry[] = [];

        if (factoryConfig) {
          onchainRoles.push({
            label: "Factory Admin",
            address: factoryConfig.admin,
            role: "factory_admin",
            source: "onchain",
          });
        }

        if (identityConfig?.owner) {
          onchainRoles.push({
            label: "Identity Registry Owner",
            address: identityConfig.owner,
            role: "identity_registry_owner",
            source: "onchain",
          });
        }

        if (claimTopicsOwner) {
          onchainRoles.push({
            label: "Claim Topics Owner",
            address: claimTopicsOwner,
            role: "claim_topics_owner",
            source: "onchain",
          });
        }

        if (complianceConfig?.owner) {
          onchainRoles.push({
            label: "Compliance Owner",
            address: complianceConfig.owner,
            role: "compliance_owner",
            source: "onchain",
          });
        }

        if (tirOwner) {
          onchainRoles.push({
            label: "TIR Owner",
            address: tirOwner,
            role: "tir_owner",
            source: "onchain",
          });
        }

        if (rolesForDefault) {
          onchainRoles.push(
            {
              label: "Token Owner",
              address: rolesForDefault.owner,
              role: "token_owner",
              source: "onchain",
            },
            {
              label: "Token Issuer",
              address: rolesForDefault.issuer,
              role: "token_issuer",
              source: "onchain",
            },
            {
              label: "Token Controller",
              address: rolesForDefault.controller,
              role: "token_controller",
              source: "onchain",
            }
          );
        }

        setRoles([...staticRoles, ...onchainRoles]);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [open, trexClient, staticRoles]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Wallet Roles</DialogTitle>
          <DialogDescription>
            Hidden view of configured and on-chain role assignments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="max-h-[62vh] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Roles</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
              {loading ? (
                <div className="text-sm text-muted-foreground">
                  Loading roles...
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {roles.map((entry) => (
                    <div
                      key={`${entry.label}-${entry.role}-${entry.address}`}
                      className="rounded-xl border border-slate-200/70 bg-white px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {entry.label}
                        </div>
                        <Badge variant="outline">{entry.source}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {entry.role}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-xs font-mono break-all flex-1">
                          {entry.address}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(entry.address);
                            toast.success("Address copied");
                          }}
                          aria-label={`Copy ${entry.label} address`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
