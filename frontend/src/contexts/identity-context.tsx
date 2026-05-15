"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { TrexClient } from "@/lib/trex-client";
import { queryCache } from "@/lib/query-cache";
import { useAppContext } from "@/contexts/app-context";

export interface UserIdentity {
  wallet: string;
  onchainIdAddress: string | null;
  country: string | null;
  isVerified: boolean;
  verificationReason: string | null;
  claims: IdentityClaim[];
}

export interface IdentityClaim {
  id: number;
  topic: number;
  topicName: string;
  issuer: string;
  data: string | null;
  issuedAt: number;
  expiresAt: number | null;
  revoked: boolean;
}

interface IdentityContextType {
  identity: UserIdentity | null;
  loading: boolean;
  error: string | null;
  loadIdentity: () => Promise<void>;
  createOnchainId: () => Promise<string>;
  registerIdentity: (country: string) => Promise<string>;
  addClaim: (topic: number, data?: string, expiresAt?: number) => Promise<string>;
  hasOnchainId: boolean;
  isVerified: boolean;
  claims: IdentityClaim[];
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

const getTopicName = (topic: number): string => {
  const topicMap: Record<number, string> = {
    1: "KYC Verified",
    2: "AML Checked",
    3: "Accredited Investor",
    4: "Country Approved",
    5: "Age Verified",
  };
  return topicMap[topic] || `Topic ${topic}`;
};

export function IdentityProvider({ children }: { children: ReactNode }) {
  const { trexClient, address: walletAddress } = useAppContext();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOnchainId, setPendingOnchainId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadIdentity = useCallback(async () => {
    if (!trexClient || !walletAddress) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const cacheKey = `identity:${walletAddress.toLowerCase()}`;
      const userIdentity = await queryCache.query(
        cacheKey,
        () => trexClient.getUserIdentity(walletAddress),
        20_000,
      );

      if (requestId !== requestIdRef.current) return;

      const claimsWithNames = (userIdentity.claims || []).map(
        (claim: any, index: number) => ({
          id: claim.id || index,
          topic: claim.topic,
          topicName: getTopicName(claim.topic),
          issuer: claim.issuer,
          data: claim.data || null,
          issuedAt: claim.issued_at || Date.now(),
          expiresAt: claim.expires_at || null,
          revoked: claim.revoked || false,
        }),
      );

      setIdentity({
        wallet: userIdentity.wallet,
        onchainIdAddress: userIdentity.onchainIdAddress || pendingOnchainId,
        country: userIdentity.country || null,
        isVerified: userIdentity.isVerified || false,
        verificationReason: userIdentity.verificationReason || null,
        claims: claimsWithNames,
      });

      if (userIdentity.onchainIdAddress && pendingOnchainId) {
        setPendingOnchainId(null);
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [trexClient, walletAddress, pendingOnchainId]);

  const createOnchainId = useCallback(async () => {
    if (!trexClient || !walletAddress) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    const loadingToast = toast.loading("Creating your OnchainID...");

    try {
      const onchainIdAddress = await trexClient.createOnChainId(
        walletAddress,
        `OnchainID-${walletAddress.slice(0, 10)}`,
      );

      setPendingOnchainId(onchainIdAddress);
      queryCache.invalidate(`identity:${walletAddress.toLowerCase()}`);

      toast.success("OnchainID created!", {
        id: loadingToast,
        description: `Address: ${onchainIdAddress.slice(0, 20)}...`,
      });

      await loadIdentity();
      return onchainIdAddress;
    } catch (err: any) {
      toast.error(`Failed to create OnchainID: ${err.message}`, {
        id: loadingToast,
      });
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trexClient, walletAddress, loadIdentity]);

  const registerIdentity = useCallback(
    async (country: string) => {
      if (!trexClient || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      const onchainIdToRegister =
        identity?.onchainIdAddress || pendingOnchainId;
      if (!onchainIdToRegister) {
        throw new Error("OnchainID must be created first");
      }

      setLoading(true);
      const loadingToast = toast.loading("Registering your identity...");

      try {
        const txHash = await trexClient.registerIdentity(
          walletAddress,
          onchainIdToRegister,
          country,
        );

        toast.success("Identity registered!", {
          id: loadingToast,
          description: `TX: ${txHash.slice(0, 10)}...`,
        });

        setPendingOnchainId(null);
        queryCache.invalidate(`identity:${walletAddress.toLowerCase()}`);
        await loadIdentity();
        return txHash;
      } catch (err: any) {
        toast.error(`Failed to register identity: ${err.message}`, {
          id: loadingToast,
        });
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trexClient, walletAddress, identity, pendingOnchainId, loadIdentity],
  );

  const addClaim = useCallback(
    async (topic: number, data?: string, expiresAt?: number) => {
      if (!trexClient || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      const onchainIdToUse = identity?.onchainIdAddress || pendingOnchainId;
      if (!onchainIdToUse) {
        throw new Error("OnchainID required");
      }

      setLoading(true);
      const topicName = getTopicName(topic);
      const loadingToast = toast.loading(`Adding ${topicName} claim...`);

      try {
        const txHash = await trexClient.addClaim(
          onchainIdToUse,
          topic,
          data,
          expiresAt,
        );

        toast.success(`${topicName} claim added!`, { id: loadingToast });
        queryCache.invalidate(`identity:${walletAddress.toLowerCase()}`);
        await loadIdentity();
        return txHash;
      } catch (err: any) {
        toast.error(`Failed to add claim: ${err.message}`, {
          id: loadingToast,
        });
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [trexClient, walletAddress, identity, pendingOnchainId, loadIdentity],
  );

  useEffect(() => {
    if (!trexClient || !walletAddress) {
      setIdentity(null);
      setError(null);
      setLoading(false);
      setPendingOnchainId(null);
      return;
    }

    loadIdentity();
  }, [trexClient, walletAddress, loadIdentity]);

  const value: IdentityContextType = {
    identity,
    loading,
    error,
    loadIdentity,
    createOnchainId,
    registerIdentity,
    addClaim,
    hasOnchainId: !!identity?.onchainIdAddress,
    isVerified: identity?.isVerified || false,
    claims: identity?.claims || [],
  };

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentityContext() {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error("useIdentityContext must be used within IdentityProvider");
  }
  return context;
}
