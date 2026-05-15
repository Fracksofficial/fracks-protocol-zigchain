"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/contexts/app-context";
import { usePermissionsContext } from "@/contexts/permissions-context";
import type { PermissionsState as ContextPermissionsState } from "@/contexts/permissions-context";
import { TREX_CONTRACTS } from "@/lib/zigchain-config";
import { queryCache } from "@/lib/query-cache";

export type PermissionsState = ContextPermissionsState;

interface UsePermissionsOptions {
  trexClient?: unknown;
  walletAddress?: string | null;
  tokenContract?: string | null;
}

export function usePermissions(options?: UsePermissionsOptions) {
  const context = usePermissionsContext();
  const { trexClient, address: walletAddress } = useAppContext();
  const tokenContract = options?.tokenContract || TREX_CONTRACTS.token;
  const needsTokenSpecific = tokenContract !== TREX_CONTRACTS.token;

  const [tokenPermissions, setTokenPermissions] = useState<
    Pick<
    PermissionsState,
    "isTokenOwner" | "isTokenIssuer" | "isTokenController" | "isTokenAgent"
    >
  >({
    isTokenOwner: context.permissions.isTokenOwner,
    isTokenIssuer: context.permissions.isTokenIssuer,
    isTokenController: context.permissions.isTokenController,
    isTokenAgent: context.permissions.isTokenAgent,
  });
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadTokenPermissions = async () => {
      if (!needsTokenSpecific) {
        setTokenPermissions({
          isTokenOwner: context.permissions.isTokenOwner,
          isTokenIssuer: context.permissions.isTokenIssuer,
          isTokenController: context.permissions.isTokenController,
          isTokenAgent: context.permissions.isTokenAgent,
        });
        setTokenLoading(false);
        return;
      }

      if (!trexClient || !walletAddress) {
        setTokenPermissions({
          isTokenOwner: false,
          isTokenIssuer: false,
          isTokenController: false,
          isTokenAgent: false,
        });
        setTokenLoading(false);
        return;
      }

      setTokenLoading(true);
      try {
        const cacheKeyBase = `${tokenContract}:${walletAddress.toLowerCase()}`;
        const [roles, isAgent] = await Promise.all([
          queryCache.query(
            `roles:${tokenContract}`,
            () => trexClient.getRoles(tokenContract),
            30_000,
          ),
          queryCache.query(
            `agent:${cacheKeyBase}`,
            () => trexClient.isAgent(walletAddress, tokenContract),
            30_000,
          ),
        ]);

        if (cancelled) return;
        const normalized = walletAddress.toLowerCase();
        setTokenPermissions({
          isTokenOwner: roles.owner.toLowerCase() === normalized,
          isTokenIssuer: roles.issuer.toLowerCase() === normalized,
          isTokenController: roles.controller.toLowerCase() === normalized,
          isTokenAgent: isAgent,
        });
      } catch {
        if (cancelled) return;
        setTokenPermissions({
          isTokenOwner: false,
          isTokenIssuer: false,
          isTokenController: false,
          isTokenAgent: false,
        });
      } finally {
        if (!cancelled) setTokenLoading(false);
      }
    };

    loadTokenPermissions();
    return () => {
      cancelled = true;
    };
  }, [
    needsTokenSpecific,
    tokenContract,
    trexClient,
    walletAddress,
    context.permissions.isTokenOwner,
    context.permissions.isTokenIssuer,
    context.permissions.isTokenController,
    context.permissions.isTokenAgent,
  ]);

  const mergedPermissions: PermissionsState = {
    ...context.permissions,
    ...tokenPermissions,
  };

  const canSeeAdminTab =
    mergedPermissions.isTokenOwner ||
    mergedPermissions.isTokenIssuer ||
    mergedPermissions.isTokenController ||
    mergedPermissions.isTokenAgent ||
    mergedPermissions.isComplianceOwner ||
    mergedPermissions.isClaimTopicsOwner ||
    mergedPermissions.isFactoryAdmin;

  return {
    ...context,
    permissions: mergedPermissions,
    loading: context.loading || tokenLoading,
    canSeeAdminTab,
  };
}
