use crate::msg::KycStatus;
use cosmwasm_std::Addr;
use cosmwasm_std::Uint128;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// Token metadata
pub const TOKEN_SYMBOL: Item<String> = Item::new("token_symbol");
pub const TOKEN_NAME: Item<String> = Item::new("token_name");
pub const TOKEN_DECIMALS: Item<u8> = Item::new("token_decimals");
pub const TOTAL_SUPPLY: Item<Uint128> = Item::new("total_supply");

// Balances and allowances (CW20 standard)
pub const BALANCES: Map<&Addr, Uint128> = Map::new("balances");
pub const ALLOWANCES: Map<(&Addr, &Addr), Uint128> = Map::new("allowances");

// Role management
pub const OWNER: Item<Addr> = Item::new("owner");
pub const ISSUER: Item<Addr> = Item::new("issuer");
pub const CONTROLLER: Item<Addr> = Item::new("controller");

// External validator addresses (TREX-style)
pub const IDENTITY_REGISTRY_ADDR: Item<Option<Addr>> = Item::new("identity_registry_addr");
pub const COMPLIANCE_ADDR: Item<Option<Addr>> = Item::new("compliance_addr");

// Token controls
pub const PAUSED: Item<bool> = Item::new("paused");
pub const CAP: Item<Option<Uint128>> = Item::new("cap");

// Minting cap enforcement (CRITICAL SECURITY)
pub const MINTING_CAP: Item<Uint128> = Item::new("minting_cap");

// Compliance and security
pub const KYC: Map<&Addr, KycStatus> = Map::new("kyc");
pub const AGENTS: Map<&Addr, bool> = Map::new("agents");
pub const FROZEN: Map<&Addr, bool> = Map::new("frozen");
pub const DENYLIST: Map<&Addr, bool> = Map::new("denylist");
pub const RULE_PLUGINS: Map<&Addr, bool> = Map::new("rule_plugins");

// Optional: index prefix for balance iteration
pub const BALANCES_PREFIX: &str = "balances";

// RWA Asset Management
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct AssetInfo {
    pub id: u64,
    pub reference_id: String,
    pub description: String,
    pub legal_owner: Addr,
    pub metadata: Option<String>,
    pub total_tokenized: Uint128,
}

pub const ASSET_SEQ: Item<u64> = Item::new("asset_seq");
pub const ASSETS: Map<u64, AssetInfo> = Map::new("assets");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct RedemptionRequest {
    pub id: u64,
    pub asset_id: u64,
    pub requester: Addr,
    pub amount: Uint128,
    pub approved: bool,
    pub reason: Option<String>,
}

pub const REDEEM_SEQ: Item<u64> = Item::new("redeem_seq");
pub const REDEEM_REQUESTS: Map<u64, RedemptionRequest> = Map::new("redeem_requests");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IssuanceRequest {
    pub id: u64,
    pub asset_id: u64,
    pub recipient: Addr,
    pub amount: Uint128,
    pub approved: bool,
}

pub const ISSUANCE_SEQ: Item<u64> = Item::new("issuance_seq");
pub const ISSUANCE_REQUESTS: Map<u64, IssuanceRequest> = Map::new("issuance_requests");

// Additional compliance features
pub const ATTESTATIONS: Map<&Addr, String> = Map::new("attestations");
pub const TRANSFER_LIMITS: Map<&Addr, Option<Uint128>> = Map::new("transfer_limits");

// Governance (multi-sig/timelock)
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct GovConfig {
    pub threshold: u32,
    pub timelock_seconds: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct GovProposal {
    pub id: u64,
    pub action: String,
    pub proposer: Addr,
    pub approvals: u32,
    pub executed: bool,
    pub creation_time: u64,
    pub timelock_end: u64,
}

pub const GOV_CONFIG: Item<Option<GovConfig>> = Item::new("gov_config");
pub const GOV_MEMBERS: Map<&Addr, bool> = Map::new("gov_members");
pub const GOV_PROPOSAL_SEQ: Item<u64> = Item::new("gov_prop_seq");
pub const GOV_PROPOSALS: Map<u64, GovProposal> = Map::new("gov_proposals");
