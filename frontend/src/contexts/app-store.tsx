"use client";

import { ReactNode, useMemo } from "react";
import { AppProvider, useAppContext } from "@/contexts/app-context";
import { AssetsProvider, useAssetsContext } from "@/contexts/assets-context";
import {
  PermissionsProvider,
  usePermissionsContext,
} from "@/contexts/permissions-context";
import { IdentityProvider, useIdentityContext } from "@/contexts/identity-context";

export function AppStoreProvider({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <AssetsProvider>
        <PermissionsProvider>
          <IdentityProvider>{children}</IdentityProvider>
        </PermissionsProvider>
      </AssetsProvider>
    </AppProvider>
  );
}

export function useAppStore() {
  const wallet = useAppContext();
  const assets = useAssetsContext();
  const permissions = usePermissionsContext();
  const identity = useIdentityContext();

  return useMemo(
    () => ({
      wallet,
      assets,
      permissions,
      identity,
    }),
    [wallet, assets, permissions, identity],
  );
}
