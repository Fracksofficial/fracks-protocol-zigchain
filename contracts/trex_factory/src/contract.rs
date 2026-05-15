use cosmwasm_std::{
    entry_point, to_json_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo, Order,
    Response, StdResult, SubMsg, Uint128, WasmMsg, Reply,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{
    AllTokensResponse, AssetIdResponse, ConfigResponse, ExecuteMsg, InstantiateMsg, MigrateMsg,
    QueryMsg, TokenInfoResponse,
};
use crate::state::{Config, TokenInfo, CONFIG, TOKENS, TOKEN_SEQ, TOKEN_TO_ASSET, PENDING_DEPLOYMENT};

const CONTRACT_NAME: &str = "crates.io:trex-factory";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

const REPLY_CTR: u64 = 1;
const REPLY_TIR: u64 = 2;
const REPLY_IR: u64 = 3;
const REPLY_COMPLIANCE: u64 = 4;
const REPLY_TOKEN: u64 = 5;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let config = Config {
        admin: _info.sender.clone(),
        token_code_id: msg.token_code_id,
        ctr_code_id: msg.ctr_code_id,
        tir_code_id: msg.tir_code_id,
        compliance_code_id: msg.compliance_code_id,
        ir_code_id: msg.ir_code_id,
        identity_registry_storage: deps.api.addr_validate(&msg.identity_registry_storage)?,
        onchainid_code_id: msg.onchainid_code_id,
        default_owner: deps.api.addr_validate(&msg.default_owner)?,
        default_issuer: deps.api.addr_validate(&msg.default_issuer)?,
        default_controller: deps.api.addr_validate(&msg.default_controller)?,
    };

    CONFIG.save(deps.storage, &config)?;
    TOKEN_SEQ.save(deps.storage, &0u64)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("admin", _info.sender)
        .add_attribute("token_code_id", msg.token_code_id.to_string())
        .add_attribute("ctr_code_id", msg.ctr_code_id.to_string())
        .add_attribute("tir_code_id", msg.tir_code_id.to_string())
        .add_attribute("compliance_code_id", msg.compliance_code_id.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::CreateToken {
            reference_id,
            name,
            symbol,
            decimals,
            description,
            legal_owner,
            metadata,
            initial_supply,
            initial_holder,
            minting_cap,
            claim_details,
        } => execute_create_token(
            deps,
            env,
            info,
            reference_id,
            name,
            symbol,
            decimals,
            description,
            legal_owner,
            metadata,
            initial_supply,
            initial_holder,
            minting_cap,
            claim_details,
        ),
        ExecuteMsg::UpdateConfig {
            token_code_id,
            ctr_code_id,
            tir_code_id,
            compliance_code_id,
            ir_code_id,
            identity_registry_storage,
            onchainid_code_id,
            default_owner,
            default_issuer,
            default_controller,
        } => execute_update_config(
            deps,
            info,
            token_code_id,
            ctr_code_id,
            tir_code_id,
            compliance_code_id,
            ir_code_id,
            identity_registry_storage,
            onchainid_code_id,
            default_owner,
            default_issuer,
            default_controller,
        ),
        ExecuteMsg::UpdateAdmin { new_admin } => execute_update_admin(deps, info, new_admin),
    }
}

fn execute_create_token(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    reference_id: String,
    name: String,
    symbol: String,
    _decimals: u8,
    description: String,
    legal_owner: String,
    metadata: Option<String>,
    _initial_supply: Option<Uint128>,
    _initial_holder: Option<String>,
    minting_cap: Uint128,
    claim_details: crate::msg::ClaimDetails,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    let mut seq = TOKEN_SEQ.load(deps.storage)?;
    seq += 1;
    TOKEN_SEQ.save(deps.storage, &seq)?;

    let legal_owner_addr = deps.api.addr_validate(&legal_owner)?;

    let pending = crate::state::PendingDeployment {
        asset_id: seq,
        name: name.clone(),
        symbol: symbol.clone(),
        reference_id: reference_id.clone(),
        description,
        legal_owner: legal_owner_addr,
        metadata,
        deployed_at: env.block.height,
        minting_cap,  // SECURITY: Save minting cap for token
        claim_details: crate::state::ClaimDetails {
            claim_topics: claim_details.claim_topics,
            issuers: claim_details.issuers,
            issuer_claims: claim_details.issuer_claims,
        },
        ctr_addr: None,
        tir_addr: None,
        ir_addr: None,
        compliance_addr: None,
    };
    
    PENDING_DEPLOYMENT.save(deps.storage, &pending)?;

    let ctr_msg = WasmMsg::Instantiate {
        admin: Some(config.admin.to_string()),
        code_id: config.ctr_code_id,
        msg: to_json_binary(&CtrInstantiateMsg {
            owner: config.default_owner.to_string(),
            required_topics: pending.claim_details.claim_topics.clone(),
        })?,
        funds: vec![],
        label: format!("CTR-{}", seq),
    };

    Ok(Response::new()
        .add_submessage(SubMsg::reply_on_success(ctr_msg, REPLY_CTR))
        .add_attribute("method", "create_token")
        .add_attribute("asset_id", seq.to_string())
        .add_attribute("reference_id", reference_id))
}

#[entry_point]
pub fn reply(deps: DepsMut, _env: Env, msg: Reply) -> Result<Response, ContractError> {
    match msg.id {
        REPLY_CTR => handle_ctr_reply(deps, msg),
        REPLY_TIR => handle_tir_reply(deps, msg),
        REPLY_IR => handle_ir_reply(deps, msg),
        REPLY_COMPLIANCE => handle_compliance_reply(deps, msg),
        REPLY_TOKEN => handle_token_reply(deps, msg),
        _ => Err(ContractError::Std(cosmwasm_std::StdError::generic_err(
            "Unknown reply ID",
        ))),
    }
}

fn extract_contract_address(msg: &Reply) -> Result<Addr, ContractError> {
    let res = match &msg.result {
        cosmwasm_std::SubMsgResult::Ok(res) => res,
        cosmwasm_std::SubMsgResult::Err(e) => {
            return Err(ContractError::Std(cosmwasm_std::StdError::generic_err(
                format!("Submessage failed: {}", e),
            )))
        }
    };
    
    let contract_address = res
        .events
        .iter()
        .find(|e| e.ty == "instantiate")
        .and_then(|e| {
            e.attributes
                .iter()
                .find(|a| a.key == "_contract_address")
                .map(|a| a.value.clone())
        })
        .ok_or_else(|| {
            ContractError::Std(cosmwasm_std::StdError::generic_err(
                "Contract address not found in reply",
            ))
        })?;

    Ok(Addr::unchecked(contract_address))
}

fn handle_ctr_reply(deps: DepsMut, msg: Reply) -> Result<Response, ContractError> {
    let ctr_addr = extract_contract_address(&msg)?;
    let config = CONFIG.load(deps.storage)?;
    
    let mut pending = PENDING_DEPLOYMENT.load(deps.storage)?;
    pending.ctr_addr = Some(ctr_addr.clone());
    PENDING_DEPLOYMENT.save(deps.storage, &pending)?;

    let tir_msg = WasmMsg::Instantiate {
        admin: Some(config.admin.to_string()),
        code_id: config.tir_code_id,
        msg: to_json_binary(&TirInstantiateMsg {
            owner: config.default_owner.to_string(),
        })?,
        funds: vec![],
        label: format!("TIR-{}", pending.asset_id),
    };

    Ok(Response::new()
        .add_submessage(SubMsg::reply_on_success(tir_msg, REPLY_TIR))
        .add_attribute("ctr_deployed", ctr_addr))
}

fn handle_tir_reply(deps: DepsMut, msg: Reply) -> Result<Response, ContractError> {
    let tir_addr = extract_contract_address(&msg)?;
    let config = CONFIG.load(deps.storage)?;
    
    let mut pending = PENDING_DEPLOYMENT.load(deps.storage)?;
    pending.tir_addr = Some(tir_addr.clone());
    PENDING_DEPLOYMENT.save(deps.storage, &pending)?;

    // NOTE: Trusted issuers must be added to TIR manually by the TIR owner after token deployment
    // Factory cannot add issuers because TIR requires info.sender == owner, and Factory is not the owner
    // The TIR owner (default_owner from config) must execute AddIssuer for each issuer

    // Instantiate Identity Registry (IR) per token
    let ir_msg = WasmMsg::Instantiate {
        admin: Some(config.admin.to_string()),
        code_id: config.ir_code_id,
        msg: to_json_binary(&IrInstantiateMsg {
            owner: config.default_owner.to_string(),
            trusted_issuers: Some(tir_addr.to_string()),
            claim_topics: Some(pending.ctr_addr.clone().unwrap().to_string()),
            identity_storage: Some(config.identity_registry_storage.to_string()),
        })?,
        funds: vec![],
        label: format!("IR-{}", pending.asset_id),
    };

    Ok(Response::new()
        .add_submessage(SubMsg::reply_on_success(ir_msg, REPLY_IR))
        .add_attribute("tir_deployed", tir_addr))
}

fn handle_ir_reply(deps: DepsMut, msg: Reply) -> Result<Response, ContractError> {
    let ir_addr = extract_contract_address(&msg)?;
    let config = CONFIG.load(deps.storage)?;
    
    let mut pending = PENDING_DEPLOYMENT.load(deps.storage)?;
    pending.ir_addr = Some(ir_addr.clone());
    PENDING_DEPLOYMENT.save(deps.storage, &pending)?;

    // Note: IR binding to IRS must be done by owner after deployment
    // Owner must execute: IRS.execute(BindIdentityRegistry { registry: IR_ADDRESS })
    // This is required because only IRS owner can bind registries (security requirement)

    let compliance_msg = WasmMsg::Instantiate {
        admin: Some(config.admin.to_string()),
        code_id: config.compliance_code_id,
        msg: to_json_binary(&ComplianceInstantiateMsg {
            owner: config.default_owner.to_string(),
            identity_registry: Some(ir_addr.to_string()),
        })?,
        funds: vec![],
        label: format!("COMPLIANCE-{}", pending.asset_id),
    };

    Ok(Response::new()
        .add_submessage(SubMsg::reply_on_success(compliance_msg, REPLY_COMPLIANCE))
        .add_attribute("ir_deployed", ir_addr)
        .add_attribute("action", "bind_ir_to_irs_required"))
}

fn handle_compliance_reply(deps: DepsMut, msg: Reply) -> Result<Response, ContractError> {
    let compliance_addr = extract_contract_address(&msg)?;
    let config = CONFIG.load(deps.storage)?;
    
    let mut pending = PENDING_DEPLOYMENT.load(deps.storage)?;
    pending.compliance_addr = Some(compliance_addr.clone());
    PENDING_DEPLOYMENT.save(deps.storage, &pending)?;

    let token_msg = WasmMsg::Instantiate {
        admin: Some(config.admin.to_string()),
        code_id: config.token_code_id,
        msg: to_json_binary(&TokenInstantiateMsg {
            name: pending.name.clone(),
            symbol: pending.symbol.clone(),
            decimals: 6,
            initial_balances: vec![],
            issuer: config.default_issuer.to_string(),
            controller: config.default_controller.to_string(),
            owner: config.default_owner.to_string(),
            cap: None,
            minting_cap: pending.minting_cap,  // SECURITY: Pass minting cap to token
            require_kyc_for_transfer: Some(true),
            identity_registry: Some(pending.ir_addr.clone().unwrap().to_string()),
            compliance: Some(compliance_addr.to_string()),
        })?,
        funds: vec![],
        label: format!("TOKEN-{}", pending.asset_id),
    };

    Ok(Response::new()
        .add_submessage(SubMsg::reply_on_success(token_msg, REPLY_TOKEN))
        .add_attribute("compliance_deployed", compliance_addr))
}

fn handle_token_reply(deps: DepsMut, msg: Reply) -> Result<Response, ContractError> {
    let token_addr = extract_contract_address(&msg)?;
    let _config = CONFIG.load(deps.storage)?;
    
    let pending = PENDING_DEPLOYMENT.load(deps.storage)?;

    let token_info = TokenInfo {
        asset_id: pending.asset_id,
        contract_address: token_addr.clone(),
        name: pending.name,
        symbol: pending.symbol,
        reference_id: pending.reference_id,
        description: pending.description,
        legal_owner: pending.legal_owner,
        metadata: pending.metadata,
        deployed_at: pending.deployed_at,
        identity_registry: pending.ir_addr.unwrap(),
        trusted_issuers_registry: pending.tir_addr.unwrap(),
        claim_topics_registry: pending.ctr_addr.unwrap(),
        compliance: pending.compliance_addr.unwrap(),
    };

    TOKENS.save(deps.storage, pending.asset_id, &token_info)?;
    TOKEN_TO_ASSET.save(deps.storage, &token_addr, &pending.asset_id)?;
    
    PENDING_DEPLOYMENT.remove(deps.storage);

    Ok(Response::new()
        .add_attribute("token_deployed", token_addr)
        .add_attribute("asset_id", pending.asset_id.to_string()))
}

fn execute_update_config(
    deps: DepsMut,
    info: MessageInfo,
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
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    if let Some(code_id) = token_code_id {
        config.token_code_id = code_id;
    }
    if let Some(code_id) = ctr_code_id {
        config.ctr_code_id = code_id;
    }
    if let Some(code_id) = tir_code_id {
        config.tir_code_id = code_id;
    }
    if let Some(code_id) = compliance_code_id {
        config.compliance_code_id = code_id;
    }
    if let Some(code_id) = ir_code_id {
        config.ir_code_id = code_id;
    }
    if let Some(irs) = identity_registry_storage {
        config.identity_registry_storage = deps.api.addr_validate(&irs)?;
    }
    if let Some(code_id) = onchainid_code_id {
        config.onchainid_code_id = code_id;
    }
    if let Some(owner) = default_owner {
        config.default_owner = deps.api.addr_validate(&owner)?;
    }
    if let Some(issuer) = default_issuer {
        config.default_issuer = deps.api.addr_validate(&issuer)?;
    }
    if let Some(controller) = default_controller {
        config.default_controller = deps.api.addr_validate(&controller)?;
    }

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new().add_attribute("method", "update_config"))
}

fn execute_update_admin(
    deps: DepsMut,
    info: MessageInfo,
    new_admin: String,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    config.admin = deps.api.addr_validate(&new_admin)?;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "update_admin")
        .add_attribute("new_admin", new_admin))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::Token { asset_id } => to_json_binary(&query_token(deps, asset_id)?),
        QueryMsg::AllTokens { start_after, limit } => {
            to_json_binary(&query_all_tokens(deps, start_after, limit)?)
        }
        QueryMsg::AssetIdByContract { contract } => {
            to_json_binary(&query_asset_id_by_contract(deps, contract)?)
        }
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        admin: config.admin.to_string(),
        token_code_id: config.token_code_id,
        ctr_code_id: config.ctr_code_id,
        tir_code_id: config.tir_code_id,
        compliance_code_id: config.compliance_code_id,
        ir_code_id: config.ir_code_id,
        identity_registry_storage: config.identity_registry_storage.to_string(),
        onchainid_code_id: config.onchainid_code_id,
        default_owner: config.default_owner.to_string(),
        default_issuer: config.default_issuer.to_string(),
        default_controller: config.default_controller.to_string(),
    })
}

fn query_token(deps: Deps, asset_id: u64) -> StdResult<TokenInfoResponse> {
    let token = TOKENS.load(deps.storage, asset_id)?;
    Ok(TokenInfoResponse {
        asset_id: token.asset_id,
        contract_address: token.contract_address.to_string(),
        name: token.name,
        symbol: token.symbol,
        reference_id: token.reference_id,
        description: token.description,
        legal_owner: token.legal_owner.to_string(),
        metadata: token.metadata,
        deployed_at: token.deployed_at,
        identity_registry: token.identity_registry.to_string(),
        trusted_issuers_registry: token.trusted_issuers_registry.to_string(),
        claim_topics_registry: token.claim_topics_registry.to_string(),
        compliance: token.compliance.to_string(),
    })
}

fn query_all_tokens(
    deps: Deps,
    start_after: Option<u64>,
    limit: Option<u32>,
) -> StdResult<AllTokensResponse> {
    let start = start_after.map(|id| id + 1).unwrap_or(1);
    let limit = limit.unwrap_or(30).min(100) as usize;

    let tokens: Vec<TokenInfoResponse> = TOKENS
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| {
            if let Ok((id, token)) = item {
                if id >= start {
                    Some(TokenInfoResponse {
                        asset_id: token.asset_id,
                        contract_address: token.contract_address.to_string(),
                        name: token.name,
                        symbol: token.symbol,
                        reference_id: token.reference_id,
                        description: token.description,
                        legal_owner: token.legal_owner.to_string(),
                        metadata: token.metadata,
                        deployed_at: token.deployed_at,
                        identity_registry: token.identity_registry.to_string(),
                        trusted_issuers_registry: token.trusted_issuers_registry.to_string(),
                        claim_topics_registry: token.claim_topics_registry.to_string(),
                        compliance: token.compliance.to_string(),
                    })
                } else {
                    None
                }
            } else {
                None
            }
        })
        .take(limit)
        .collect();

    Ok(AllTokensResponse { tokens })
}

fn query_asset_id_by_contract(deps: Deps, contract: String) -> StdResult<AssetIdResponse> {
    let contract_addr = deps.api.addr_validate(&contract)?;
    let asset_id = TOKEN_TO_ASSET.load(deps.storage, &contract_addr)?;
    Ok(AssetIdResponse { asset_id })
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("method", "migrate"))
}

#[derive(serde::Serialize, serde::Deserialize)]
struct CtrInstantiateMsg {
    pub owner: String,
    pub required_topics: Vec<u32>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct TirInstantiateMsg {
    pub owner: String,
}

#[allow(dead_code)]
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
enum TirExecuteMsg {
    AddIssuer { issuer: String, topics: Vec<u32> },
}

#[derive(serde::Serialize, serde::Deserialize)]
struct IrInstantiateMsg {
    pub owner: String,
    pub trusted_issuers: Option<String>,
    pub claim_topics: Option<String>,
    pub identity_storage: Option<String>,
}

// Note: IrsExecuteMsg kept for reference but binding is now done manually by owner
#[allow(dead_code)]
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
enum IrsExecuteMsg {
    BindIdentityRegistry { registry: String },
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ComplianceInstantiateMsg {
    pub owner: String,
    pub identity_registry: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct TokenInstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub initial_balances: Vec<InitialBalance>,
    pub issuer: String,
    pub controller: String,
    pub owner: String,
    pub cap: Option<Uint128>,
    pub minting_cap: Uint128,  // SECURITY: Maximum tokens that can be minted
    pub require_kyc_for_transfer: Option<bool>,
    pub identity_registry: Option<String>,
    pub compliance: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct InitialBalance {
    pub address: String,
    pub amount: Uint128,
}
