use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct PendingDeployment {
    pub asset_id: u64,
    pub name: String,
    pub symbol: String,
    pub reference_id: String,
    pub description: String,
    pub legal_owner: Addr,
    pub metadata: Option<String>,
    pub deployed_at: u64,
    pub minting_cap: cosmwasm_std::Uint128,  // SECURITY: Minting cap for token
    pub claim_details: ClaimDetails,
    pub ctr_addr: Option<Addr>,
    pub tir_addr: Option<Addr>,
    pub ir_addr: Option<Addr>,
    pub compliance_addr: Option<Addr>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ClaimDetails {
    pub claim_topics: Vec<u32>,
    pub issuers: Vec<String>,
    pub issuer_claims: Vec<Vec<u32>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub admin: Addr,
    pub token_code_id: u64,
    pub ctr_code_id: u64,
    pub tir_code_id: u64,
    pub compliance_code_id: u64,
    pub ir_code_id: u64,
    pub identity_registry_storage: Addr,
    pub onchainid_code_id: u64,
    pub default_owner: Addr,
    pub default_issuer: Addr,
    pub default_controller: Addr,
}

/// Token deployment record
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct TokenInfo {
    pub asset_id: u64,
    pub contract_address: Addr,
    pub name: String,
    pub symbol: String,
    pub reference_id: String,
    pub description: String,
    pub legal_owner: Addr,
    pub metadata: Option<String>,
    pub deployed_at: u64,
    pub identity_registry: Addr,
    pub trusted_issuers_registry: Addr,
    pub claim_topics_registry: Addr,
    pub compliance: Addr,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const TOKEN_SEQ: Item<u64> = Item::new("token_seq");
pub const PENDING_DEPLOYMENT: Item<PendingDeployment> = Item::new("pending");

pub const TOKENS: Map<u64, TokenInfo> = Map::new("tokens");

pub const TOKEN_TO_ASSET: Map<&Addr, u64> = Map::new("token_to_asset");
