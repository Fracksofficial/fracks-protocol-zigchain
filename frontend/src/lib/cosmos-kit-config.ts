import { getZigChainConfig } from "@/lib/zigchain-config";
import { wallets as keplrWallets } from "@cosmos-kit/keplr";
import { wallets as leapWallets } from "@cosmos-kit/leap";
import { wallets as cosmostationWallets } from "@cosmos-kit/cosmostation";
import { wallets as stationWallets } from "@cosmos-kit/station";
import { WalletConnectOptions } from "@cosmos-kit/core";

const zigConfig = getZigChainConfig();
const isTestnet = zigConfig.chainId.includes("test");

export const COSMOS_KIT_CHAIN_NAME = isTestnet
  ? "zigchain-testnet"
  : "zigchain";

export const zigchainChain: any = {
  chain_id: zigConfig.chainId,
  chain_name: COSMOS_KIT_CHAIN_NAME,
  pretty_name: isTestnet ? "ZigChain Testnet" : "ZigChain",
  status: "live",
  network_type: isTestnet ? "testnet" : "mainnet",
  bech32_prefix: zigConfig.prefix,
  slip44: 118,
  fees: {
    fee_tokens: [
      {
        denom: zigConfig.tokenDenom,
        fixed_min_gas_price: 0.01,
        low_gas_price: 0.01,
        average_gas_price: 0.025,
        high_gas_price: 0.04,
      },
    ],
  },
  staking: {
    staking_tokens: [{ denom: zigConfig.tokenDenom }],
  },
  apis: {
    rpc: [{ address: zigConfig.rpcEndpoint }],
    rest: [{ address: zigConfig.restEndpoint || zigConfig.rpcEndpoint }],
  },
};

export const zigchainAssets: any = {
  chain_name: COSMOS_KIT_CHAIN_NAME,
  assets: [
    {
      base: zigConfig.tokenDenom,
      name: zigConfig.tokenSymbol,
      symbol: zigConfig.tokenSymbol,
      display: zigConfig.tokenSymbol,
      denom_units: [
        { denom: zigConfig.tokenDenom, exponent: 0 },
        { denom: zigConfig.tokenSymbol, exponent: 6 },
      ],
    },
  ],
};

export const cosmosKitWallets = [
  ...keplrWallets,
  ...leapWallets,
  ...cosmostationWallets,
  ...stationWallets,
];

export const walletConnectOptions: WalletConnectOptions = {
  signClient: {
    projectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
      "2c21904d808d48a37955523cb5a8523c", // Fallback to a demo Project ID
    relayUrl: "wss://relay.walletconnect.org",
    metadata: {
      name: "RWA Platform",
      description: "TRex-compatible RWA platform on Cosmos",
      url: "http://localhost:3000",
      icons: ["https://zigscan.net/img/logo.png"],
    },
  },
};
