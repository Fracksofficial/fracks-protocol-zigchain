export interface ZigChainConfig {
  rpcEndpoint: string;
  chainId: string;
  prefix: string;
  gasPrice: string;
  restEndpoint?: string;
  explorerUrl?: string;
  tokenDenom: string;
  tokenSymbol: string;
}

// Helper to ensure RPC URL is absolute (required for Cosmos Kit)
const getAbsoluteRpcUrl = (rpcUrl?: string) => {
  const url = rpcUrl || "/api/rpc";
  if (url.startsWith("http") || url.startsWith("ws")) return url;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // Remove trailing slash from base and leading slash from url to avoid double slash
  return `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
};

// ZigChain Testnet Configuration
export const ZIGCHAIN_TESTNET: ZigChainConfig = {
  rpcEndpoint: getAbsoluteRpcUrl(process.env.NEXT_PUBLIC_ZIGCHAIN_RPC),
  chainId: process.env.NEXT_PUBLIC_ZIGCHAIN_CHAIN_ID || "zig-test-2",
  prefix: "zig",
  gasPrice: "0.025uzig",
  restEndpoint:
    process.env.NEXT_PUBLIC_ZIGCHAIN_REST ||
    "https://rest.zigchain-testnet-1.zigchain.org",
  explorerUrl: "https://zigscan.net",
  tokenDenom: "uzig",
  tokenSymbol: "ZIG",
};

// ZigChain Mainnet Configuration
export const ZIGCHAIN_MAINNET: ZigChainConfig = {
  rpcEndpoint:
    process.env.NEXT_PUBLIC_ZIGCHAIN_RPC ||
    "https://rpc.zigchain-mainnet-1.zigchain.org",
  chainId: process.env.NEXT_PUBLIC_ZIGCHAIN_CHAIN_ID || "zigchain-mainnet-1",
  prefix: "zig",
  gasPrice: "0.025uzig",
  restEndpoint:
    process.env.NEXT_PUBLIC_ZIGCHAIN_REST ||
    "https://rest.zigchain-mainnet-1.zigchain.org",
  explorerUrl: "https://explorer.zigchain.org",
  tokenDenom: "uzig",
  tokenSymbol: "ZIG",
};

// Select configuration based on environment
export const getZigChainConfig = (): ZigChainConfig => {
  const isTestnet =
    process.env.NEXT_PUBLIC_ZIGCHAIN_CHAIN_ID?.includes("testnet") ||
    process.env.NEXT_PUBLIC_ZIGCHAIN_CHAIN_ID?.includes("zig-test") ||
    true;
  return isTestnet ? ZIGCHAIN_TESTNET : ZIGCHAIN_MAINNET;
};

// TREX Contract Suite Addresses (PRODUCTION-READY - Tested Dec 15, 2025)
// All contracts verified with 21/21 tests passing
const envTokenList = (process.env.NEXT_PUBLIC_TREX_TOKEN_LIST || "")
  .split(",")
  .map((token) => token.trim())
  .filter(Boolean);
const defaultTokens = [
  process.env.NEXT_PUBLIC_TREX_TOKEN_RE ||
    "zig1stejrmcpjw8y707cdeqa9t4yta0asrzy4ahu8v4fe9uv843rywss56sw6h",
  process.env.NEXT_PUBLIC_TREX_TOKEN_ST ||
    "zig1534ffnjjgdtthasgwgxtlhtjgvajrwr826tul5wqff4gkppd2lmqj248qj",
].filter(Boolean);
const tokenList = envTokenList.length > 0 ? envTokenList : defaultTokens;

export const TREX_CONTRACTS = {
  // Default token (used as fallback when a specific token is not selected)
  token:
    process.env.NEXT_PUBLIC_TREX_TOKEN ||
    tokenList[0] ||
    "zig1stejrmcpjw8y707cdeqa9t4yta0asrzy4ahu8v4fe9uv843rywss56sw6h",
  // Known token contracts for this deployment
  tokens: tokenList,

  // Identity Registry (Code 1567) - 8/8 integration tests passed
  // Maps wallet addresses to OnChainID contracts, validates investor registration
  identityRegistry:
    process.env.NEXT_PUBLIC_TREX_IR ||
    "zig1vth88kets72vp8zwj28uqe4zkzthavcsnjg4ce407sw2mudkdcjqc2fh5m",

  // Trusted Issuers Registry (Code 1480) - TIR authorization validated
  // Whitelist of authorized claim issuers, prevents unauthorized claims
  trustedIssuers:
    process.env.NEXT_PUBLIC_TREX_TIR ||
    "zig1mk83hyfjq0nr2q3ej44j6zd8wwappr50zpa87s74r7mx7tu824cqfnsg5v",

  // Claim Topics Registry (Code 1562) - Required claim topics (KYC, AML, etc.)
  claimTopics:
    process.env.NEXT_PUBLIC_TREX_CTR ||
    "zig1t0ragkey8dxnzacmy2pd8w5255qg23v7t5g9f06d88ty79wgzd6spw7m60",

  // Compliance Contract - Enforces transfer rules and restrictions
  compliance:
    process.env.NEXT_PUBLIC_TREX_COMPLIANCE ||
    "zig1zxwtghu2t98z7dryecjxmlqr75rus7sjzvcyz9hhlcs6vwdcn4nsx96gkg",

  // OnChainID Code ID (1594) - 7/7 security tests passed
  // TIR integration working: authorized claims accepted, unauthorized rejected
  onchainIdCodeId: parseInt(
    process.env.NEXT_PUBLIC_ONCHAINID_CODE_ID || "1668",
  ),

  // TREX Factory (Code 1599) - Multi-token architecture for per-asset tokens
  // Creates separate CW3643 token contract per asset with shared compliance
  factory:
    process.env.NEXT_PUBLIC_TREX_FACTORY ||
    "zig14f2w4p9gdgkdh66qg55cs6mlf0ya9grl7uytnc4aw8wz8keh6g9q6sxd7k",
};

// Example OnChainID instances (for testing/demo)
export const EXAMPLE_IDENTITIES = {
  issuer:
    process.env.NEXT_PUBLIC_ISSUER_IDENTITY ||
    "zig1nuvq66l5yj9tnjs00ns9k2xgda2h62lcaaqazdewx0xt7agfw7xq5x492s",
  investor:
    process.env.NEXT_PUBLIC_INVESTOR_IDENTITY ||
    "zig1xdn3yevwn4txsfswjh2lnk8mu7srgaamgc8rd5nsq9gkvw3nxj9snhqhnd",
};

// Known contract owners (for authorization reference and troubleshooting)
export const CONTRACT_OWNERS = {
  // Platform owner/admin of core contracts
  admin: "zig1rtrnuyh5s3y367az3600sy4ujheyccq70vjps2",
  adminName: "mywallet_recovered",
};

// Known role wallets for this deployment (optional UI hints)
export const ROLE_WALLETS = {
  platformOwner:
    process.env.NEXT_PUBLIC_PLATFORM_OWNER ||
    "zig1rtrnuyh5s3y367az3600sy4ujheyccq70vjps2",
  kycIssuer:
    process.env.NEXT_PUBLIC_KYC_ISSUER ||
    "zig1mfs7e8ut85g8fcxw4lr49d3404usljwxpk4nm2",
  fundRealEstate:
    process.env.NEXT_PUBLIC_FUND_REAL ||
    "zig1sr7sla9prdzgyf453ywrc9hue4za0kut7jmeqm",
  fundStocks:
    process.env.NEXT_PUBLIC_FUND_STOCKS ||
    "zig19cffmzhul8fqvyqk4wxqwmvj85el0vr0kefctn",
};

// Legacy contract addresses (deprecated - use TREX_CONTRACTS instead)
// Updated to point to production-ready tested contracts
/** @deprecated Use TREX_CONTRACTS.token instead */
export const CONTRACT_ADDRESSES = {
  rwaRegistry: TREX_CONTRACTS.token, // New token with IR integration
  complianceModule: TREX_CONTRACTS.compliance,
  tokenizationModule: TREX_CONTRACTS.token, // New token with IR integration
  kycModule: TREX_CONTRACTS.identityRegistry, // New IR with validation
};
