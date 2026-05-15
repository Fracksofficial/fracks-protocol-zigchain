'use client';

import { useCallback, useEffect } from 'react';
import { useChain } from '@cosmos-kit/react';
import { WalletStatus } from '@cosmos-kit/core';
import { TrexClient } from '@/lib/trex-client';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/app-context';
import { COSMOS_KIT_CHAIN_NAME } from '@/lib/cosmos-kit-config';
import { TREX_CONTRACTS } from '@/lib/zigchain-config';
import { queryCache } from '@/lib/query-cache';
import type { ComplianceConfigResponse } from '@/types/trex-contracts';

let sharedHydrationKey = '';
let sharedHydrationPromise: Promise<{
  address: string;
  client: TrexClient;
  balance: string;
} | null> | null = null;

export function useWallet() {
  const {
    address,
    balance,
    trexClient,
    isConnected,
    isConnecting,
    setWalletState,
    setIsConnecting,
    clearWalletState,
  } = useAppContext();
  const {
    address: chainAddress,
    connect,
    disconnect: disconnectWallet,
    getOfflineSigner,
    status,
  } = useChain(COSMOS_KIT_CHAIN_NAME);

  /**
   * Connect to Keplr wallet
   */
  const connectKeplr = useCallback(async () => {
    try {
      setIsConnecting(true);
      await connect();
    } catch (error: any) {
      console.error('Failed to connect to Keplr:', error);
      toast.error(error.message || 'Failed to connect wallet');
      setIsConnecting(false);
    }
  }, [connect, setIsConnecting]);

  /**
   * Connect to Leap wallet (alternative)
   */
  const connectLeap = useCallback(async () => {
    try {
      setIsConnecting(true);
      await connect();
    } catch (error: any) {
      console.error('Failed to connect to Leap:', error);
      toast.error(error.message || 'Failed to connect wallet');
      setIsConnecting(false);
    }
  }, [connect, setIsConnecting]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    disconnectWallet();
    clearWalletState();
    toast.info('Wallet disconnected');
  }, [disconnectWallet, clearWalletState]);

  /**
   * Refresh balance
   */
  const refreshBalance = useCallback(async () => {
    if (address && trexClient) {
      try {
        const nativeBal = await trexClient.getNativeBalance(address);
        setWalletState(address, trexClient, nativeBal);
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    }
  }, [address, trexClient, setWalletState]);

  /**
   * Auto-connect on mount if previously connected
   */
  useEffect(() => {
    const hydrateWallet = async () => {
      const hydrateKey = `${status}:${chainAddress || ''}`;

      if (!chainAddress || status !== WalletStatus.Connected) {
        if (sharedHydrationKey !== hydrateKey) {
          sharedHydrationKey = hydrateKey;
          clearWalletState();
        }
        return;
      }

      if (address === chainAddress && trexClient && sharedHydrationKey === hydrateKey) {
        return;
      }

      try {
        setIsConnecting(true);

        if (!sharedHydrationPromise) {
          sharedHydrationPromise = (async () => {
            const signer = getOfflineSigner?.();
            if (!signer) {
              throw new Error('Wallet signer not available');
            }

            const client = await TrexClient.connectWithSigner(
              signer,
              chainAddress
            );
            let nativeBal = '0';
            try {
              nativeBal = await client.getNativeBalance(chainAddress);
            } catch (balError) {
              console.error('Failed to fetch native balance:', balError);
            }

            // Fire-and-forget prefetch to reduce page loading delays
            const normalizedWallet = chainAddress.toLowerCase();
            const identityKey = `identity:${normalizedWallet}`;
            const permissionsKey = `permissions:${normalizedWallet}:${TREX_CONTRACTS.token}`;
            queryCache
              .query(identityKey, () => client.getUserIdentity(chainAddress), 20_000)
              .catch(() => null);
            queryCache
              .query(
                permissionsKey,
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
                    client.getFactoryConfig().catch(() => null),
                    client.getIdentityRegistryConfig().catch(() => null),
                    client.getClaimTopicsOwner().catch(() => null),
                    client.getComplianceConfig().catch(() => null),
                    client.getRoles(TREX_CONTRACTS.token).catch(() => null),
                    client.isAgent(chainAddress, TREX_CONTRACTS.token).catch(() => false),
                    client.getIssuerTopics(chainAddress).catch(() => null),
                  ]);

                  const isFactoryAdmin =
                    !!factoryConfig &&
                    factoryConfig.admin.toLowerCase() === normalizedWallet;
                  const isIdentityRegistryOwner =
                    !!identityRegistryConfig &&
                    identityRegistryConfig.owner.toLowerCase() === normalizedWallet;
                  const isClaimTopicsOwner =
                    !!claimTopicsOwner &&
                    claimTopicsOwner.toLowerCase() === normalizedWallet;
                  const isComplianceOwner =
                    !!(complianceConfig as ComplianceConfigResponse | null) &&
                    (
                      complianceConfig as ComplianceConfigResponse
                    ).owner.toLowerCase() === normalizedWallet;
                  const isTokenOwner =
                    !!tokenRoles && tokenRoles.owner.toLowerCase() === normalizedWallet;
                  const isTokenIssuer =
                    !!tokenRoles && tokenRoles.issuer.toLowerCase() === normalizedWallet;
                  const isTokenController =
                    !!tokenRoles && tokenRoles.controller.toLowerCase() === normalizedWallet;
                  const isTokenAgent = !!isAgent;
                  const hasIssuerTopics = !!issuerTopics && issuerTopics.length > 0;
                  const canKycProvider = !!issuerTopics && issuerTopics.includes(1);

                  return {
                    isFactoryAdmin,
                    isIdentityRegistryOwner,
                    isClaimTopicsOwner,
                    isComplianceOwner,
                    isTokenOwner,
                    isTokenIssuer,
                    isTokenController,
                    isTokenAgent,
                    isTrustedIssuer: hasIssuerTopics,
                    canKycProvider,
                  };
                },
                60_000,
              )
              .catch(() => null);

            sharedHydrationKey = hydrateKey;
            return {
              address: chainAddress,
              client,
              balance: nativeBal,
            };
          })().finally(() => {
            sharedHydrationPromise = null;
          });
        }

        const hydrated = await sharedHydrationPromise;
        if (hydrated) {
          setWalletState(hydrated.address, hydrated.client, hydrated.balance);
        }
      } catch (error: any) {
        console.error('Failed to initialize wallet:', error);
        toast.error(error.message || 'Failed to initialize wallet');
      } finally {
        setIsConnecting(false);
      }
    };

    hydrateWallet();
  }, [
    chainAddress,
    address,
    trexClient,
    status,
    getOfflineSigner,
    setWalletState,
    clearWalletState,
    setIsConnecting,
  ]);

  return {
    // State
    address,
    isConnecting: isConnecting || status === WalletStatus.Connecting,
    balance,
    trexClient,
    isConnected: status === WalletStatus.Connected && !!address,

    // Actions
    connectKeplr,
    connectLeap,
    disconnect,
    refreshBalance,
  };
}
