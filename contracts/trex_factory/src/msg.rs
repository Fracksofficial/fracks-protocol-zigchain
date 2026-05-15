use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct ClaimDetails {
    pub claim_topics: Vec<u32>,
    pub issuers: Vec<String>,
    pub issuer_claims: Vec<Vec<u32>>,
}

#[cw_serde]
pub struct InstantiateMsg {
    pub token_code_id: u64,
    pub ctr_code_id: u64,
    pub tir_code_id: u64,
    pub compliance_code_id: u64,
    pub ir_code_id: u64,
    pub identity_registry_storage: String,
    pub onchainid_code_id: u64,
    pub default_owner: String,
    pub default_issuer: String,
    pub default_controller: String,
}

#[cw_serde]
pub enum ExecuteMsg {
    CreateToken {
        reference_id: String,
        name: String,
        symbol: String,
        decimals: u8,
        description: String,
        legal_owner: String,
        metadata: Option<String>,
        initial_supply: Option<Uint128>,
        initial_holder: Option<String>,
        minting_cap: Uint128,  // REQUIRED: Maximum tokens that can be minted
        claim_details: ClaimDetails,
    },

    UpdateConfig {
        token_code_id: Option<u64>,
        ctr_code_id: Option<u64>,
        tir_code_id: Option<u64>,
        compliance_code_id: Option<u64>,
        ir_code_id: Option<u64>,
        identity_registry_storage: Option<String>,
        onchainid_code_id: Option<u64>,
        default_owner: Option<String>,
        default_issuer: Option<String>,
        default_controller: Option<String>,
    },

    /// Transfer admin rights (admin only)
    UpdateAdmin { new_admin: String },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get factory configuration
    #[returns(ConfigResponse)]
    Config {},

    /// Get token info by asset_id
    #[returns(TokenInfoResponse)]
    Token { asset_id: u64 },

    /// List all tokens
    #[returns(AllTokensResponse)]
    AllTokens {
        start_after: Option<u64>,
        limit: Option<u32>,
    },

    /// Get asset_id by token contract address
    #[returns(AssetIdResponse)]
    AssetIdByContract { contract: String },
}

// Response types
#[cw_serde]
pub struct ConfigResponse {
    pub admin: String,
    pub token_code_id: u64,
    pub ctr_code_id: u64,
    pub tir_code_id: u64,
    pub compliance_code_id: u64,
    pub ir_code_id: u64,
    pub identity_registry_storage: String,
    pub onchainid_code_id: u64,
    pub default_owner: String,
    pub default_issuer: String,
    pub default_controller: String,
}

#[cw_serde]
pub struct TokenInfoResponse {
    pub asset_id: u64,
    pub contract_address: String,
    pub name: String,
    pub symbol: String,
    pub reference_id: String,
    pub description: String,
    pub legal_owner: String,
    pub metadata: Option<String>,
    pub deployed_at: u64,
    pub identity_registry: String,
    pub trusted_issuers_registry: String,
    pub claim_topics_registry: String,
    pub compliance: String,
}

#[cw_serde]
pub struct AllTokensResponse {
    pub tokens: Vec<TokenInfoResponse>,
}

#[cw_serde]
pub struct AssetIdResponse {
    pub asset_id: u64,
}

#[cw_serde]
pub struct MigrateMsg {}
