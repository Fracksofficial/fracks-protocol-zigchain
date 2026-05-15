use cosmwasm_schema::QueryResponses;
use cosmwasm_std::Uint128;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Initial balance used at instantiation
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InitialBalance {
    pub address: String,
    pub amount: Uint128,
}

/// Instantiate message tailored for a compliant security token
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub initial_balances: Vec<InitialBalance>,
    pub issuer: String,
    pub controller: String,
    pub owner: String,
    pub cap: Option<Uint128>,
    pub minting_cap: Uint128,  // REQUIRED: Maximum tokens that can ever be minted
    pub require_kyc_for_transfer: Option<bool>,
    // Optional external validator contracts
    pub identity_registry: Option<String>,
    pub compliance: Option<String>,
}

/// KYC status for an address
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum KycStatus {
    Pending,
    Approved,
    Revoked,
}

/// Execute messages for CW-3643 compliant security token
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    // Standard CW20 operations
    Transfer {
        recipient: String,
        amount: Uint128,
    },
    Approve {
        spender: String,
        amount: Uint128,
    },
    TransferFrom {
        owner: String,
        recipient: String,
        amount: Uint128,
    },
    Mint {
        recipient: String,
        amount: Uint128,
    },
    Burn {
        amount: Uint128,
    },
    // ERC-3643 compliant: Force burn from any address (agent only)
    ForceBurn {
        from: String,
        amount: Uint128,
    },
    
    // Compliance-specific operations (TREX standard)
    ForceTransfer {
        from: String,
        to: String,
        amount: Uint128,
        reason: Option<String>,
    },
    SetKycStatus {
        address: String,
        status: KycStatus,
    },
    Pause {},
    Unpause {},
    
    // Role management
    UpdateOwner {
        owner: String,
    },
    UpdateIssuer {
        issuer: String,
    },
    UpdateController {
        controller: String,
    },
    UpdateValidators {
        identity_registry: Option<String>,
        compliance: Option<String>,
    },
    AddAgent {
        address: String,
    },
    RemoveAgent {
        address: String,
    },
    
    // Security controls
    AddToDenylist { 
        address: String 
    },
    RemoveFromDenylist { 
        address: String 
    },
    Freeze {
        address: String,
    },
    Unfreeze {
        address: String,
    },
    FreezeMany {
        addresses: Vec<String>,
    },
    
    // Batch operations
    BatchTransfer {
        transfers: Vec<TransferItem>,
    },
    BatchSetKyc {
        updates: Vec<KycUpdate>,
    },
    
    // Recovery operations
    ReplaceWallet {
        lost: String,
        new: String,
    },
    
    // Compliance rule plugins
    UpdateRulePlugins {
        add: Vec<String>,
        remove: Vec<String>,
    },
    
    // RWA-specific asset management
    CreateAsset {
        reference_id: String,
        description: String,
        legal_owner: String,
        metadata: Option<String>,
    },
    IssueAsset {
        asset_id: u64,
        recipient: String,
        amount: Uint128,
    },
    RequestRedemption {
        asset_id: u64,
        amount: Uint128,
        reason: Option<String>,
    },
    ApproveIssue {
        request_id: u64,
    },
    ApproveRedemption {
        request_id: u64,
    },
    AttachAttestation {
        subject: String,
        attestation: String,
    },
    SetTransferLimit {
        address: String,
        limit: Option<Uint128>,
    },
    
    // Governance (multi-sig/timelock)
    SetGovernanceConfig { 
        members: Vec<String>, 
        threshold: u32, 
        timelock_seconds: u64 
    },
    SubmitGovProposal { 
        action: String 
    },
    ApproveGovProposal { 
        proposal_id: u64 
    },
    ExecuteGovProposal { 
        proposal_id: u64 
    },
}

/// Query messages and responses
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema, QueryResponses)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    #[returns(TokenInfoResponse)]
    TokenInfo {},
    #[returns(Uint128)]
    Balance { address: String },
    #[returns(Uint128)]
    Allowance { owner: String, spender: String },
    #[returns(Uint128)]
    TotalSupply {},
    #[returns(KycStatusResponse)]
    KycStatus { address: String },
    #[returns(AssetInfoResponse)]
    AssetInfo { asset_id: u64 },
    #[returns(Vec<RedeemRequestResponse>)]
    RedemptionRequests {
        start_after: Option<u64>,
        limit: Option<u32>,
    },
    #[returns(RolesResponse)]
    Roles {},
    #[returns(bool)]
    Paused {},
    #[returns(Option<Uint128>)]
    TransferLimit { address: String },
    #[returns(Option<Uint128>)]
    Cap {},
    #[returns(MintingCapResponse)]
    MintingCap {},
    #[returns(ValidatorsResponse)]
    Validators {},
    #[returns(AgentsResponse)]
    Agents {},
    #[returns(bool)]
    Frozen { address: String },
    #[returns(RulePluginsResponse)]
    RulePlugins {},
    #[returns(ComplianceMetricsResponse)]
    ComplianceMetrics {},
    #[returns(GovConfigResponse)]
    GovConfig {},
    #[returns(GovProposalResponse)]
    GovProposal { proposal_id: u64 },
    #[returns(Vec<GovProposalResponse>)]
    GovProposals { start_after: Option<u64>, limit: Option<u32> },
}

// Response types
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct TokenInfoResponse {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct KycStatusResponse {
    pub address: String,
    pub status: KycStatus,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct AssetInfoResponse {
    pub asset_id: u64,
    pub reference_id: String,
    pub description: String,
    pub legal_owner: String,
    pub metadata: Option<String>,
    pub total_tokenized: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct RedeemRequestResponse {
    pub id: u64,
    pub asset_id: u64,
    pub requester: String,
    pub amount: Uint128,
    pub approved: bool,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct RolesResponse {
    pub owner: String,
    pub issuer: String,
    pub controller: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ValidatorsResponse {
    pub identity_registry: Option<String>,
    pub compliance: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct AgentsResponse {
    pub agents: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MintingCapResponse {
    pub minting_cap: Uint128,
    pub current_supply: Uint128,
    pub available_to_mint: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct RulePluginsResponse {
    pub plugins: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct TransferItem {
    pub recipient: String,
    pub amount: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct KycUpdate {
    pub address: String,
    pub status: KycStatus,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ComplianceMetricsResponse {
    pub kyc_pending: u32,
    pub kyc_approved: u32,
    pub kyc_revoked: u32,
    pub frozen_count: u32,
    pub denylisted: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct GovConfigResponse {
    pub members: Vec<String>,
    pub threshold: u32,
    pub timelock_seconds: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct GovProposalResponse {
    pub id: u64,
    pub action: String,
    pub proposer: String,
    pub approvals: u32,
    pub executed: bool,
    pub creation_time: u64,
    pub timelock_end: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MigrateMsg {}
