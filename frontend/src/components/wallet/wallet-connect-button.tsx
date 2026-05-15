"use client";

import { useChain } from "@cosmos-kit/react";
import { WalletStatus } from "@cosmos-kit/core";
import { Button } from "@/components/ui/button";
import { COSMOS_KIT_CHAIN_NAME } from "@/lib/cosmos-kit-config";

export function WalletConnectButton() {
  const { status, address, openView } = useChain(COSMOS_KIT_CHAIN_NAME);
  const isConnected = status === WalletStatus.Connected;

  return (
    <Button
      onClick={openView}
      className="bg-gradient-to-tr from-[#172E7F] to-[#2A5FA6] text-white rounded-[11px] px-6 h-10 font-medium"
    >
      {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Connect Wallet"}
    </Button>
  );
}
