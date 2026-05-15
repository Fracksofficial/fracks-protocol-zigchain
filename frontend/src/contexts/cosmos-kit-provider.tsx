"use client";

import { ReactNode } from "react";
import { ChainProvider } from "@cosmos-kit/react";
import {
  zigchainChain,
  zigchainAssets,
  cosmosKitWallets,
  walletConnectOptions,
} from "@/lib/cosmos-kit-config";

export function CosmosKitProvider({ children }: { children: ReactNode }) {
  return (
    <ChainProvider
      chains={[zigchainChain]}
      assetLists={[zigchainAssets]}
      wallets={cosmosKitWallets}
      walletConnectOptions={walletConnectOptions}
      throwErrors={false}
    >
      {children}
    </ChainProvider>
  );
}
