"use client";

/**
 * PermissionsContext - Centralized, singleton provider for user permissions.
 *
 * Previously, the Sidebar, Dashboard, Compliance, Issuance, KYC Provider, Token Admin,
 * Personnel, and Admin Identities pages each called `usePermissions()` independently,
 * each making 7 parallel RPC calls to check roles. With 9 consumers, that's 63 redundant RPC calls.
 *
 * Now, permissions are fetched ONCE in this provider and shared via context.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { TREX_CONTRACTS, ROLE_WALLETS } from "@/lib/zigchain-config";
import { queryCache } from "@/lib/query-cache";
import { useAppContext } from "@/contexts/app-context";
import type { ComplianceConfigResponse } from "@/types/trex-contracts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PermissionsState {
  isFactoryAdmin: boolean;
  isIdentityRegistryOwner: boolean;
  isClaimTopicsOwner: boolean;
  isComplianceOwner: boolean;
  isTokenOwner: boolean;
  isTokenIssuer: boolean;
  isTokenController: boolean;
  isTokenAgent: boolean;
  isTrustedIssuer: boolean;
  canKycProvider: boolean;
}

interface PermissionsContextType {
  permissions: PermissionsState;
  loading: boolean;
  error: string | null;
  canSeeAdminIdentities: boolean;
  canSeeCompliance: boolean;
  canSeeIssuance: boolean;
  canSeeKycProvider: boolean;
  canSeeAdminTab: boolean;
  canSeeActivityLogs: boolean;
}

const emptyPermissions: PermissionsState = {
  isFactoryAdmin: false,
  isIdentityRegistryOwner: false,
  isClaimTopicsOwner: false,
  isComplianceOwner: false,
  isTokenOwner: false,
  isTokenIssuer: false,
  isTokenController: false,
  isTokenAgent: false,
  isTrustedIssuer: false,
  canKycProvider: false,
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined,
);

// ─── Provider ────────────────────────────────────────────────────────────────

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { trexClient, address: walletAddress } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] =
    useState<PermissionsState>(emptyPermissions);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let isCancelled = false;

    const loadPermissions = async () => {
      if (!trexClient || !walletAddress) {
        setPermissions(emptyPermissions);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const normalizedWallet = walletAddress.toLowerCase();
        const contractToCheck = TREX_CONTRACTS.token;
        const cacheKey = `permissions:${normalizedWallet}:${contractToCheck}`;

        const result = await queryCache.query(
          cacheKey,
          async () => {
            const [
              factoryConfig,
              identityRegistryConfig,
              claimTopicsOwner,
              complianceConfig,
              tokenRoles,
              isAgent,
              issuerTopics,
            ] = await Promise.all([
              trexClient.getFactoryConfig().catch(() => null),
              trexClient.getIdentityRegistryConfig().catch(() => null),
              trexClient.getClaimTopicsOwner().catch(() => null),
              trexClient.getComplianceConfig().catch(() => null),
              trexClient.getRoles(contractToCheck).catch(() => null),
              trexClient
                .isAgent(walletAddress, contractToCheck)
                .catch(() => false),
              trexClient.getIssuerTopics(walletAddress).catch(() => null),
            ]);

            const isFactoryAdmin =
              !!factoryConfig &&
              factoryConfig.admin.toLowerCase() === normalizedWallet;
            const isIdentityRegistryOwner =
              !!identityRegistryConfig &&
              identityRegistryConfig.owner.toLowerCase() === normalizedWallet;
            const isClaimTopicsOwner2 =
              !!claimTopicsOwner &&
              claimTopicsOwner.toLowerCase() === normalizedWallet;
            const isComplianceOwner =
              !!(complianceConfig as ComplianceConfigResponse | null) &&
              (
                complianceConfig as ComplianceConfigResponse
              ).owner.toLowerCase() === normalizedWallet;
            const isTokenOwner =
              !!tokenRoles &&
              tokenRoles.owner.toLowerCase() === normalizedWallet;
            const isTokenIssuer =
              !!tokenRoles &&
              tokenRoles.issuer.toLowerCase() === normalizedWallet;
            const isTokenController =
              !!tokenRoles &&
              tokenRoles.controller.toLowerCase() === normalizedWallet;
            const isTokenAgent = !!isAgent;
            const hasIssuerTopics = !!issuerTopics && issuerTopics.length > 0;
            const canKycProvider = !!issuerTopics && issuerTopics.includes(1);

            return {
              isFactoryAdmin,
              isIdentityRegistryOwner,
              isClaimTopicsOwner: isClaimTopicsOwner2,
              isComplianceOwner,
              isTokenOwner,
              isTokenIssuer,
              isTokenController,
              isTokenAgent,
              isTrustedIssuer: hasIssuerTopics,
              canKycProvider,
            };
          },
          60_000, // 60s TTL - permissions rarely change
        );

        if (isCancelled || requestId !== requestIdRef.current) {
          return;
        }

        setPermissions(result);
      } catch (err: any) {
        console.error("Failed to load permissions:", err);
        setError(err.message || "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
    return () => {
      isCancelled = true;
    };
  }, [trexClient, walletAddress]);

  // ─ Derived visibility flags ─
  const canSeeAdminIdentities = useMemo(
    () => permissions.isIdentityRegistryOwner || permissions.isTrustedIssuer,
    [permissions],
  );
  const canSeeCompliance =
    permissions.isComplianceOwner || permissions.isFactoryAdmin;
  const canSeeIssuance = permissions.isFactoryAdmin;
  const canSeeKycProvider = permissions.canKycProvider;
  const canSeeAdminTab =
    permissions.isTokenOwner ||
    permissions.isTokenIssuer ||
    permissions.isTokenController ||
    permissions.isTokenAgent ||
    permissions.isComplianceOwner ||
    permissions.isClaimTopicsOwner ||
    permissions.isFactoryAdmin;
  const canSeeActivityLogs =
    !!walletAddress &&
    walletAddress.toLowerCase() === ROLE_WALLETS.platformOwner.toLowerCase();

  const value: PermissionsContextType = {
    permissions,
    loading,
    error,
    canSeeAdminIdentities,
    canSeeCompliance,
    canSeeIssuance,
    canSeeKycProvider,
    canSeeAdminTab,
    canSeeActivityLogs,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ─── Consumer Hook ───────────────────────────────────────────────────────────

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error(
      "usePermissionsContext must be used within PermissionsProvider",
    );
  }
  return context;
}
