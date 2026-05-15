"use client";

/**
 * AssetsContext - Centralized, singleton provider for RWA asset data.
 *
 * Previously, every page/component that needed assets called `useAssets()` independently,
 * each creating its own state and triggering its own API/RPC calls. With ~14 consumers
 * (Header, Dashboard, Assets page, Compliance, Issuance, Transfer, etc.),
 * this caused 14x redundant fetches on each navigation.
 *
 * Now, assets are fetched ONCE in this provider and shared via context.
 * Components consume `useAssetsContext()` instead of creating new `useAssets()` instances.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { TrexClient } from "@/lib/trex-client";
import { RWAAsset, IssuanceRequest } from "@/types/rwa";
import { toast } from "sonner";
import { apiFetch, getBackendUrl } from "@/lib/backend";
import { queryCache } from "@/lib/query-cache";
import { useAppContext } from "@/contexts/app-context";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssetsContextType {
  assets: RWAAsset[];
  loading: boolean;
  error: string | null;
  selectedAsset: RWAAsset | null;
  setSelectedAsset: (asset: RWAAsset | null) => void;
  loadAssets: () => Promise<void>;
  issueAsset: (request: IssuanceRequest) => Promise<void>;
  updateCompliance: (
    assetId: string,
    status: string,
    requirements: Record<string, any>,
  ) => Promise<void>;
  mintTokens: (
    assetId: string,
    recipient: string,
    amount: number,
  ) => Promise<void>;
  transferTokens: (
    assetId: string,
    recipient: string,
    amount: number,
  ) => Promise<void>;
  getBalance: (assetId: string, address: string) => Promise<number>;
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function mapIndexedAsset(asset: {
  id: string;
  factoryAssetId?: number | null;
  tokenContract: string;
  name: string;
  symbol: string;
  issuerWallet?: string | null;
  legalOwner?: string | null;
  description?: string | null;
  referenceId?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  deployedAt?: string | null;
}): RWAAsset {
  const rawMetadata =
    typeof asset.metadata === "string"
      ? safeParseJson(asset.metadata)
      : asset.metadata || {};
  const validAssetTypes = [
    "real-estate",
    "commodity",
    "equity",
    "debt",
    "art",
    "intellectual-property",
  ];
  const assetType = validAssetTypes.includes(rawMetadata.type)
    ? rawMetadata.type
    : "real-estate";
  const issuedAt = asset.deployedAt
    ? new Date(asset.deployedAt)
    : asset.createdAt
      ? new Date(asset.createdAt)
      : new Date();

  return {
    id: asset.factoryAssetId ? asset.factoryAssetId.toString() : asset.id,
    name: rawMetadata.name || asset.name,
    symbol: asset.symbol,
    description: asset.description || rawMetadata.description || "",
    assetType: assetType as
      | "real-estate"
      | "commodity"
      | "equity"
      | "debt"
      | "art"
      | "intellectual-property",
    totalSupply: 0,
    tokenizedAmount: 0,
    tokenPrice: 1.0,
    tokenDenom: "uzig",
    underlyingValue: rawMetadata.underlyingValue || 0,
    currency: rawMetadata.currency || "USD",
    location: rawMetadata.location || "",
    issuer: asset.issuerWallet || asset.legalOwner || "",
    issuerAddress: asset.issuerWallet || asset.legalOwner || "",
    complianceStatus: "compliant" as const,
    kycRequired: true,
    amlRequired: true,
    accreditedInvestorsOnly: false,
    issuanceDate: issuedAt,
    lastUpdated: asset.updatedAt ? new Date(asset.updatedAt) : issuedAt,
    documents: [],
    contractAddress: asset.tokenContract,
    tokenContractAddress: asset.tokenContract,
    chainId: "zig-test-2",
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AssetsProvider({ children }: { children: ReactNode }) {
  const { trexClient, address: walletAddress } = useAppContext();
  const [assets, setAssets] = useState<RWAAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<RWAAsset | null>(null);
  const loadingRef = useRef(false);

  // ─ Load all assets (deduplicated) ─
  const loadAssets = useCallback(async () => {
    // Prevent concurrent loads
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const backendUrl = getBackendUrl();
      if (!backendUrl) {
        throw new Error("Backend URL not configured");
      }

      const indexedAssets = await queryCache.query(
        "assets:indexed",
        () =>
          apiFetch<
            Array<{
              id: string;
              factoryAssetId?: number | null;
              tokenContract: string;
              name: string;
              symbol: string;
              issuerWallet?: string | null;
              legalOwner?: string | null;
              description?: string | null;
              referenceId?: string | null;
              metadata?: any;
              createdAt?: string;
              updatedAt?: string;
              deployedAt?: string | null;
            }>
          >("/indexed/assets"),
        60_000, // 60s TTL for indexed assets
      );

      const loadedAssets = indexedAssets.map(mapIndexedAsset);
      setAssets(loadedAssets);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // ─ Issue new asset via factory ─
  const issueAsset = useCallback(
    async (request: IssuanceRequest) => {
      if (!trexClient || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      setError(null);
      const loadingToast = toast.loading("Creating asset token via factory...");

      try {
        const factoryConfig = await trexClient.getFactoryConfig();
        const normalizedWallet = walletAddress.toLowerCase();
        if (factoryConfig.admin.toLowerCase() !== normalizedWallet) {
          throw new Error(
            "Only the factory admin wallet can create new tokens.",
          );
        }

        const { assetDetails } = request;
        const legalOwner = assetDetails.legalOwner || walletAddress;
        const desiredOwner = request.tokenDetails.owner || walletAddress;
        const desiredIssuer = request.tokenDetails.issuer || walletAddress;
        const desiredController =
          request.tokenDetails.controller || walletAddress;
        const needsRoleUpdate =
          factoryConfig.default_owner !== desiredOwner ||
          factoryConfig.default_issuer !== desiredIssuer ||
          factoryConfig.default_controller !== desiredController;

        if (needsRoleUpdate) {
          toast.loading("Updating factory defaults...", { id: loadingToast });
          await trexClient.updateFactoryConfig({
            default_owner: desiredOwner,
            default_issuer: desiredIssuer,
            default_controller: desiredController,
          });
        }

        const result = await trexClient.createAssetToken({
          referenceId: assetDetails.symbol,
          description: assetDetails.description,
          legalOwner,
          name: assetDetails.name,
          tokenName: request.tokenDetails.tokenName || assetDetails.name,
          tokenSymbol: request.tokenDetails.tokenSymbol || assetDetails.symbol,
          decimals: request.tokenDetails.decimals,
          type: assetDetails.assetType,
          location: assetDetails.location,
          underlyingValue: assetDetails.underlyingValue,
          currency: assetDetails.currency,
          mintingCap: String(assetDetails.totalSupply),
          claimDetails: {
            claim_topics: [1, 2],
            issuers: [desiredIssuer],
            issuer_claims: [[1, 2]],
          },
        });

        toast.success(
          `Asset token created! Asset ID: ${result.assetId}, Contract: ${result.tokenContract.slice(
            0,
            10,
          )}...`,
          { id: loadingToast },
        );

        // Invalidate cache and reload
        toast.loading("Syncing blockchain state...", { id: loadingToast });
        queryCache.invalidatePrefix("assets:");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await loadAssets();

        toast.success("Asset fully synchronized!", { id: loadingToast });
      } catch (err: any) {
        setError(err.message);
        toast.error(`Failed to create asset token: ${err.message}`, {
          id: loadingToast,
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trexClient, walletAddress, loadAssets],
  );

  // ─ Update compliance status ─
  const updateCompliance = useCallback(
    async (
      assetId: string,
      status: string,
      requirements: Record<string, any>,
    ) => {
      if (!trexClient || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        toast.info("Compliance update not yet implemented");
        throw new Error("Not implemented yet");
      } catch (err: any) {
        toast.error("Failed to update compliance");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trexClient, walletAddress],
  );

  // ─ Mint tokens ─
  const mintTokens = useCallback(
    async (assetId: string, recipient: string, amount: number) => {
      if (!trexClient || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      const loadingToast = toast.loading("Minting tokens...");

      try {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) {
          throw new Error("Asset not found");
        }

        const txHash = await trexClient.mint(
          recipient,
          amount.toString(),
          asset.tokenContractAddress,
        );
        toast.success(`Tokens minted! TX: ${txHash.slice(0, 10)}...`, {
          id: loadingToast,
        });
        queryCache.invalidatePrefix("assets:");
        await loadAssets();
      } catch (err: any) {
        toast.error(`Failed to mint tokens: ${err.message}`, {
          id: loadingToast,
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trexClient, walletAddress, assets, loadAssets],
  );

  // ─ Transfer tokens ─
  const transferTokens = useCallback(
    async (assetId: string, recipient: string, amount: number) => {
      if (!trexClient || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      const loadingToast = toast.loading("Transferring tokens...");

      try {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) {
          throw new Error("Asset not found");
        }

        const txHash = await trexClient.transferFromToken(
          asset.tokenContractAddress,
          recipient,
          amount.toString(),
        );
        toast.success(`Tokens transferred! TX: ${txHash.slice(0, 10)}...`, {
          id: loadingToast,
        });
        queryCache.invalidatePrefix("assets:");
        await loadAssets();
      } catch (err: any) {
        toast.error(`Failed to transfer tokens: ${err.message}`, {
          id: loadingToast,
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trexClient, walletAddress, assets, loadAssets],
  );

  // ─ Get token balance ─
  const getBalance = useCallback(
    async (assetId: string, address: string) => {
      if (!trexClient) return 0;

      try {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) return 0;

        const balance = await trexClient.getBalanceForToken(
          asset.tokenContractAddress,
          address,
        );
        return parseInt(balance) || 0;
      } catch (err: any) {
        console.error("Failed to get balance:", err);
        return 0;
      }
    },
    [trexClient, assets],
  );

  // ─ Auto-load assets on mount ─
  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AssetsContextType = {
    assets,
    loading,
    error,
    selectedAsset,
    setSelectedAsset,
    loadAssets,
    issueAsset,
    updateCompliance,
    mintTokens,
    transferTokens,
    getBalance,
  };

  return (
    <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>
  );
}

// ─── Consumer Hook ───────────────────────────────────────────────────────────

export function useAssetsContext() {
  const context = useContext(AssetsContext);
  if (!context) {
    throw new Error("useAssetsContext must be used within AssetsProvider");
  }
  return context;
}
