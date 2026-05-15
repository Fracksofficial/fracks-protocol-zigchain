/**
 * TREX Contract Type Definitions
 * Exact TypeScript mappings for Rust contract schemas
 * Auto-generated from CW3643 contracts
 */

// ========================================
// TOKEN CONTRACT (cw3643-token)
// ========================================

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
}

export interface BalanceResponse {
  balance: string;
}

export interface AllowanceResponse {
  allowance: string;
  expires: { never: {} } | { at_height: number } | { at_time: string };
}

export interface RolesResponse {
  owner: string;
  issuer: string;
  controller: string;
}

export interface AgentsResponse {
  agents: string[];
}

export interface RedeemRequestResponse {
  id: number;
  asset_id: number;
  requester: string;
  amount: string;
  approved: boolean;
  reason?: string;
}

export interface IssuanceRequestResponse {
  id: number;
  asset_id: number;
  recipient: string;
  amount: string;
  approved: boolean;
}

export interface TokenQueryMsg {
  token_info?: {};
  balance?: { address: string };
  allowance?: { owner: string; spender: string };
  roles?: {};
  agents?: {};
  paused?: {};
  frozen?: { address: string };
  redemption_requests?: { start_after?: number; limit?: number };
  issuance_requests?: { start_after?: number; limit?: number };
}

export interface TokenExecuteMsg {
  transfer?: { recipient: string; amount: string };
  burn?: { amount: string };
  send?: { contract: string; amount: string; msg: string };
  increase_allowance?: {
    spender: string;
    amount: string;
    expires?: { never: {} } | { at_height: number } | { at_time: string };
  };
  decrease_allowance?: {
    spender: string;
    amount: string;
    expires?: { never: {} } | { at_height: number } | { at_time: string };
  };
  transfer_from?: { owner: string; recipient: string; amount: string };
  mint?: { recipient: string; amount: string };
  freeze?: { address: string };
  unfreeze?: { address: string };
  pause?: {};
  unpause?: {};
  force_transfer?: { from: string; to: string; amount: string };
  set_identity_registry?: { new_ir: string };
  set_compliance?: { new_compliance: string };
  // Role management
  update_owner?: { owner: string };
  update_issuer?: { issuer: string };
  update_controller?: { controller: string };
  add_agent?: { address: string };
  remove_agent?: { address: string };
  // Batch operations
  batch_set_kyc?: { updates: Array<{ address: string; status: string }> };
  // Issuance and redemption
  request_redemption?: { asset_id: number; amount: string; reason?: string };
  approve_redemption?: { request_id: number };
  issue_asset?: { asset_id: number; recipient: string; amount: string };
  approve_issue?: { request_id: number };
}

export interface TokenInstantiateMsg {
  name: string;
  symbol: string;
  decimals: number;
  initial_supply?: string;
  owner: string;
  identity_registry: string;
  compliance: string;
}

// ========================================
// FACTORY CONTRACT
// ========================================

export interface FactoryConfig {
  admin: string;
  token_code_id: number;
  ctr_code_id: number;
  tir_code_id: number;
  compliance_code_id: number;
  ir_code_id: number;
  identity_registry_storage: string;
  onchainid_code_id: number;
  default_owner: string;
  default_issuer: string;
  default_controller: string;
}

export interface TokenInfoFromFactory {
  asset_id: number;
  contract_address: string;
  name: string;
  symbol: string;
  reference_id: string;
  description: string;
  legal_owner: string;
  metadata?: string;
  deployed_at: number;
}

export interface AllTokensResponse {
  tokens: TokenInfoFromFactory[];
}

export interface FactoryQueryMsg {
  config?: {};
  token?: { asset_id: number };
  all_tokens?: { start_after?: number; limit?: number };
  asset_id_by_contract?: { contract: string };
}

export interface CreateAssetTokenParams {
  reference_id: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  legal_owner: string;
  metadata?: string;
  initial_supply: string;
  initial_holder: string;
  minting_cap: string;
  claim_details: {
    claim_topics: number[];
    issuers: string[];
    issuer_claims: number[][];
  };
}

export interface FactoryExecuteMsg {
  create_token?: CreateAssetTokenParams;
  update_config?: Partial<Omit<FactoryConfig, 'admin'>>;
}

// ========================================
// IDENTITY REGISTRY
// ========================================

export interface IsVerifiedResponse {
  verified: boolean;
  reason?: string;
}

export interface IdentityResponse {
  wallet: string;
  identity_addr?: string;
  country?: string;
}

export interface IRConfigResponse {
  owner: string;
  trusted_issuers: string;
  claim_topics: string;
}

export interface IRQueryMsg {
  is_verified?: { wallet: string };
  identity?: { wallet: string };
  config?: {};
}

export interface IRExecuteMsg {
  register_identity?: {
    wallet: string;
    identity_addr: string;
    country?: string;
  };
  unregister_identity?: { wallet: string };
  update_identity?: {
    wallet: string;
    identity_addr?: string;
    country?: string;
  };
  update_config?: {
    trusted_issuers?: string;
    claim_topics?: string;
  };
}

export interface IRInstantiateMsg {
  owner: string;
  trusted_issuers: string;
  claim_topics: string;
}

// ========================================
// TRUSTED ISSUERS REGISTRY
// ========================================

export interface IssuerTopicsResponse {
  issuer: string;
  topics: number[];
}

export interface AllIssuersResponse {
  issuers: Array<{
    issuer: string;
    topics: number[];
  }>;
}

export interface IsIssuerForTopicResponse {
  is_issuer: boolean;
}

export interface TIRQueryMsg {
  issuer_topics?: { issuer: string };
  is_issuer_for_topic?: { issuer: string; topic: number };
  all_issuers?: {};
}

export interface TIRExecuteMsg {
  add_issuer?: { issuer: string; topics: number[] };
  remove_issuer?: { issuer: string };
  update_issuer_topics?: { issuer: string; topics: number[] };
  update_owner?: { owner: string };
}

export interface TIRInstantiateMsg {
  owner: string;
}

// ========================================
// CLAIM TOPICS REGISTRY
// ========================================

export interface RequiredTopicsResponse {
  topics: number[];
}

export interface CTRQueryMsg {
  required_topics?: {};
  owner?: {};
}

export interface CTRExecuteMsg {
  set_required_topics?: { topics: number[] };
}

export interface CTRInstantiateMsg {
  owner: string;
  topics?: number[];
}

// ========================================
// ONCHAINID
// ========================================

export interface Claim {
  topic: number;
  issuer: string;
  data: string;
  uri: string;
}

export interface ClaimResponse {
  claim?: Claim;
}

export interface ClaimsByTopicResponse {
  claims: Claim[];
}

export interface OIDConfigResponse {
  owner: string;
}

export interface OIDQueryMsg {
  get_claim?: { topic: number; issuer: string };
  claims_by_topic?: { topic: number };
  has_valid_claim?: { topic: number; issuer_whitelist?: string[]; at_time?: number };
  config?: {};
}

export interface OIDExecuteMsg {
  add_claim?: {
    topic: number;
    issuer: string;
    data: string | null;  // Required field, but can be null
    expires_at: number | null;  // Required field, but can be null
  };
  revoke_claim?: { topic: number; claim_id: number };
  update_owner?: { owner: string };
}

export interface OIDInstantiateMsg {
  owner: string;
}

// ========================================
// COMPLIANCE CONTRACT
// ========================================

export interface CanTransferResponse {
  allowed: boolean;
  reason?: string;
}

export interface ComplianceConfigResponse {
  owner: string;
  identity_registry?: string;
  allowed_countries?: string[];
  module_count?: number;
}

export interface ComplianceQueryMsg {
  can_transfer?: {
    token: string;
    from: string;
    to: string;
    amount: string;
  };
  config?: {};
}

export interface ComplianceExecuteMsg {
  transferred?: { from: string; to: string; amount: string };
  set_per_address_limit?: { address: string; limit?: string };
  set_allowed_countries?: { countries?: string[] };
  set_identity_registry?: { addr?: string };
}

export interface ComplianceInstantiateMsg {
  owner: string;
  token: string;
}

// ========================================
// COMMON TYPES
// ========================================

export interface CosmosMsg {
  bank?: { send?: { to_address: string; amount: Coin[] } };
  staking?: any;
  distribution?: any;
  stargate?: any;
  ibc?: any;
  wasm?: {
    execute?: {
      contract_addr: string;
      msg: any;
      funds: Coin[];
    };
    instantiate?: {
      admin?: string;
      code_id: number;
      msg: any;
      funds: Coin[];
      label: string;
    };
  };
}

export interface Coin {
  denom: string;
  amount: string;
}

export interface ContractInfo {
  code_id: number;
  creator: string;
  admin?: string;
  label: string;
}

// ========================================
// FRONTEND DOMAIN TYPES
// ========================================

export interface TrexToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  isPaused: boolean;
}

export interface UserIdentity {
  wallet: string;
  onchainIdAddress?: string;
  country?: string;
  isVerified: boolean;
  verificationReason?: string;
  claims: Claim[];
}

export interface TrexCompliance {
  canTransfer: boolean;
  reason?: string;
  requiredTopics: number[];
  trustedIssuers: Array<{
    issuer: string;
    topics: number[];
  }>;
}

export interface TransferRequest {
  from: string;
  to: string;
  amount: string;
  complianceCheck?: CanTransferResponse;
}

// ========================================
// CLAIM TOPIC CONSTANTS
// ========================================

export const CLAIM_TOPICS = {
  KYC: 1,
  AML: 2,
  ACCREDITED_INVESTOR: 3,
  RESIDENCY: 4,
} as const;

export const CLAIM_TOPIC_NAMES: Record<number, string> = {
  1: 'KYC (Know Your Customer)',
  2: 'AML (Anti-Money Laundering)',
  3: 'Accredited Investor',
  4: 'Residency Verification',
};

// ========================================
// TYPE GUARDS
// ========================================

export function isTokenExecuteMsg(msg: unknown): msg is TokenExecuteMsg {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    ('transfer' in msg ||
      'mint' in msg ||
      'burn' in msg ||
      'freeze' in msg ||
      'pause' in msg)
  );
}

export function isIdentityResponse(obj: unknown): obj is IdentityResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'wallet' in obj &&
    typeof (obj as IdentityResponse).wallet === 'string'
  );
}

export function isClaim(obj: unknown): obj is Claim {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'topic' in obj &&
    'issuer' in obj &&
    'data' in obj &&
    'uri' in obj
  );
}
