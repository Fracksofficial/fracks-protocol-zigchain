//! Identity Registry Contract
//!
//! This contract manages identity registrations for wallets, linking them to
//! ONCHAINID contracts and performing claim-based verification through
//! trusted issuers and required claim topics.

use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:identity-registry-cw";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    let owner = deps.api.addr_validate(&msg.owner)?;
    OWNER.save(deps.storage, &owner)?;
    TRUSTED_ISSUERS_ADDR.save(
        deps.storage,
        &msg.trusted_issuers
            .and_then(|s| deps.api.addr_validate(&s).ok()),
    )?;
    CLAIM_TOPICS_ADDR.save(
        deps.storage,
        &msg.claim_topics
            .and_then(|s| deps.api.addr_validate(&s).ok()),
    )?;
    IDENTITY_STORAGE_ADDR.save(
        deps.storage,
        &msg.identity_storage
            .and_then(|s| deps.api.addr_validate(&s).ok()),
    )?;
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::RegisterIdentity {
            wallet,
            identity_addr,
            country,
        } => {
            only_owner(deps.as_ref(), &info)?;
            let w = deps.api.addr_validate(&wallet)?;
            let i = deps.api.addr_validate(&identity_addr)?;
            REGISTRY.save(
                deps.storage,
                &w,
                &IdentityRef {
                    identity_addr: i,
                    country,
                },
            )?;
            Ok(Response::new()
                .add_attribute("action", "register_identity")
                .add_attribute("wallet", wallet))
        }
        ExecuteMsg::UnregisterIdentity { wallet } => {
            only_owner(deps.as_ref(), &info)?;
            let w = deps.api.addr_validate(&wallet)?;
            REGISTRY.remove(deps.storage, &w);
            Ok(Response::new()
                .add_attribute("action", "unregister_identity")
                .add_attribute("wallet", wallet))
        }
        ExecuteMsg::UpdateIdentity {
            wallet,
            identity_addr,
        } => {
            only_owner(deps.as_ref(), &info)?;
            let w = deps.api.addr_validate(&wallet)?;
            let new_identity = deps.api.addr_validate(&identity_addr)?;
            
            // Load existing registration
            let mut reg = REGISTRY
                .may_load(deps.storage, &w)?
                .ok_or(ContractError::NotRegistered {})?;
            
            let old_identity = reg.identity_addr.clone();
            reg.identity_addr = new_identity.clone();
            
            REGISTRY.save(deps.storage, &w, &reg)?;
            
            Ok(Response::new()
                .add_attribute("action", "update_identity")
                .add_attribute("wallet", wallet)
                .add_attribute("old_identity", old_identity.to_string())
                .add_attribute("new_identity", new_identity.to_string()))
        }
        ExecuteMsg::UpdateCountry { wallet, country } => {
            only_owner(deps.as_ref(), &info)?;
            let w = deps.api.addr_validate(&wallet)?;
            
            // Load existing registration
            let mut reg = REGISTRY
                .may_load(deps.storage, &w)?
                .ok_or(ContractError::NotRegistered {})?;
            
            let old_country = reg.country.clone();
            reg.country = country.clone();
            
            REGISTRY.save(deps.storage, &w, &reg)?;
            
            Ok(Response::new()
                .add_attribute("action", "update_country")
                .add_attribute("wallet", wallet)
                .add_attribute("old_country", old_country.unwrap_or_else(|| "none".to_string()))
                .add_attribute("new_country", country.unwrap_or_else(|| "none".to_string())))
        }
        ExecuteMsg::UpdateOwner { owner } => {
            only_owner(deps.as_ref(), &info)?;
            let o = deps.api.addr_validate(&owner)?;
            OWNER.save(deps.storage, &o)?;
            Ok(Response::new()
                .add_attribute("action", "update_owner")
                .add_attribute("owner", owner))
        }
        ExecuteMsg::UpdateTrustedIssuers { addr } => {
            only_owner(deps.as_ref(), &info)?;
            let a = addr.and_then(|s| deps.api.addr_validate(&s).ok());
            TRUSTED_ISSUERS_ADDR.save(deps.storage, &a)?;
            Ok(Response::new().add_attribute("action", "update_trusted_issuers"))
        }
        ExecuteMsg::UpdateClaimTopics { addr } => {
            only_owner(deps.as_ref(), &info)?;
            let a = addr.and_then(|s| deps.api.addr_validate(&s).ok());
            CLAIM_TOPICS_ADDR.save(deps.storage, &a)?;
            Ok(Response::new().add_attribute("action", "update_claim_topics"))
        }
        ExecuteMsg::BindIdentityStorage { addr } => {
            only_owner(deps.as_ref(), &info)?;
            
            // Save IRS address locally
            let irs_addr_opt = addr.as_ref().and_then(|s| deps.api.addr_validate(s).ok());
            IDENTITY_STORAGE_ADDR.save(deps.storage, &irs_addr_opt)?;
            
            // If IRS address is provided, notify IRS to register this IR
            let mut response = Response::new().add_attribute("action", "bind_identity_storage");
            
            if let Some(irs_addr) = irs_addr_opt {
                // Create ExecuteMsg to bind this IR in the IRS
                // Using the BindIdentityRegistry message from IRS
                #[derive(serde::Serialize)]
                #[serde(rename_all = "snake_case")]
                enum IrsExecuteMsg {
                    BindIdentityRegistry { registry: String },
                }
                
                let bind_msg = cosmwasm_std::WasmMsg::Execute {
                    contract_addr: irs_addr.to_string(),
                    msg: cosmwasm_std::to_json_binary(&IrsExecuteMsg::BindIdentityRegistry {
                        registry: _env.contract.address.to_string()
                    })?,
                    funds: vec![],
                };
                
                response = response
                    .add_message(bind_msg)
                    .add_attribute("irs_address", irs_addr.to_string())
                    .add_attribute("notified_irs", "true");
            }
            
            Ok(response)
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::IsVerified { wallet } => to_json_binary(&query_is_verified(deps, wallet)?),
        QueryMsg::Identity { wallet } => to_json_binary(&query_identity(deps, wallet)?),
        QueryMsg::Contains { wallet } => to_json_binary(&query_contains(deps, wallet)?),
        QueryMsg::TrustedIssuersRegistry {} => to_json_binary(&query_trusted_issuers_registry(deps)?),
        QueryMsg::ClaimTopicsRegistry {} => to_json_binary(&query_claim_topics_registry(deps)?),
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
    }
}

fn query_is_verified(deps: Deps, wallet: String) -> StdResult<IsVerifiedResponse> {
    let w = deps.api.addr_validate(&wallet)?;
    
    // Try local registry first
    let entry = REGISTRY.may_load(deps.storage, &w)?;
    
    // If not in local registry, try IRS (if bound)
    let reg = if let Some(ref local_reg) = entry {
        local_reg.clone()
    } else {
        // Try querying IRS
        let irs_addr = IDENTITY_STORAGE_ADDR.may_load(deps.storage)?.flatten();
        if let Some(irs) = irs_addr {
            #[derive(serde::Serialize)]
            #[serde(rename_all = "snake_case")]
            enum IrsQuery {
                StoredIdentity { wallet: String },
            }
            #[derive(serde::Deserialize)]
            struct StoredIdentityResponse {
                identity: String,
                country: u16,
            }
            
            // Query IRS for investor data
            match deps.querier.query_wasm_smart::<StoredIdentityResponse>(
                irs.clone(),
                &IrsQuery::StoredIdentity { wallet: wallet.clone() },
            ) {
                Ok(irs_data) => {
                    // Found in IRS - use that data
                    let identity_addr = deps.api.addr_validate(&irs_data.identity)?;
                    IdentityRef {
                        identity_addr,
                        country: Some(irs_data.country.to_string()),
                    }
                },
                Err(_) => {
                    // Not in IRS either - not registered
                    return Ok(IsVerifiedResponse {
                        verified: false,
                        reason: Some("wallet not registered in IR or IRS".to_string()),
                    });
                }
            }
        } else {
            // No IRS bound and not in local registry
            return Ok(IsVerifiedResponse {
                verified: false,
                reason: Some("wallet not registered".to_string()),
            });
        }
    };

    // If both TIR and CTR are configured and identity_addr exists, perform claim-aware checks
    let tir = TRUSTED_ISSUERS_ADDR.may_load(deps.storage)?.flatten();
    let ctr = CLAIM_TOPICS_ADDR.may_load(deps.storage)?.flatten();
    if let (Some(tir_addr), Some(ctr_addr)) = (tir, ctr) {
        if reg.identity_addr.as_str().is_empty() {
            return Ok(IsVerifiedResponse {
                verified: false,
                reason: Some("missing identity address".to_string()),
            });
        }
        // 1) fetch required topics from CTR
        #[derive(serde::Serialize)]
        #[serde(rename_all = "snake_case")]
        enum CtrQuery {
            RequiredTopics {},
        }
        #[derive(serde::Deserialize)]
        struct RequiredTopicsResponse {
            topics: Vec<u32>,
        }
        let topics: Vec<u32> = deps
            .querier
            .query_wasm_smart::<RequiredTopicsResponse>(
                ctr_addr.clone(),
                &CtrQuery::RequiredTopics {},
            )?
            .topics;

        // If no required topics configured, fall back to registration-only success
        if topics.is_empty() {
            return Ok(IsVerifiedResponse {
                verified: true,
                reason: None,
            });
        }

        // 2) ERC-3643 v4.0 OPTIMIZATION: Query TIR for issuers per topic (not all issuers)
        // This reduces from O(n*m) to O(m) where n=total issuers, m=required topics
        #[derive(serde::Serialize)]
        #[serde(rename_all = "snake_case")]
        enum TirQuery {
            TrustedIssuersForTopic { topic: u32 },
        }
        #[derive(serde::Deserialize)]
        struct TrustedIssuersForTopicResponse {
            issuers: Vec<String>,
        }

        // 3) for each topic, fetch trusted issuers and query ONCHAINID for a valid claim
        #[derive(serde::Serialize)]
        #[serde(rename_all = "snake_case")]
        enum OnIdQuery<'a> {
            HasValidClaim {
                topic: u32,
                issuer_whitelist: Option<Vec<&'a str>>,
                at_time: Option<u64>,
            },
        }
        #[derive(serde::Deserialize)]
        struct HasValidClaimResponse {
            valid: bool,
        }

        for t in topics.into_iter() {
            // Use v4.0 optimized query - fetch only issuers for this topic
            let whitelist: Vec<String> = deps
                .querier
                .query_wasm_smart::<TrustedIssuersForTopicResponse>(
                    tir_addr.clone(),
                    &TirQuery::TrustedIssuersForTopic { topic: t },
                )?
                .issuers;
                
            if whitelist.is_empty() {
                return Ok(IsVerifiedResponse {
                    verified: false,
                    reason: Some(format!("no trusted issuers for topic {}", t)),
                });
            }
            let refs: Vec<&str> = whitelist.iter().map(|s| s.as_str()).collect();
            let resp: HasValidClaimResponse = deps.querier.query_wasm_smart(
                reg.identity_addr.clone(),
                &OnIdQuery::HasValidClaim {
                    topic: t,
                    issuer_whitelist: Some(refs),
                    at_time: None,
                },
            )?;
            if !resp.valid {
                return Ok(IsVerifiedResponse {
                    verified: false,
                    reason: Some(format!("missing required claim for topic {}", t)),
                });
            }
        }
        return Ok(IsVerifiedResponse {
            verified: true,
            reason: None,
        });
    }

    // Fallback: registration-only success
    Ok(IsVerifiedResponse {
        verified: true,
        reason: None,
    })
}

fn query_identity(deps: Deps, wallet: String) -> StdResult<IdentityResponse> {
    let w = deps.api.addr_validate(&wallet)?;
    let info = REGISTRY.may_load(deps.storage, &w)?;
    Ok(IdentityResponse {
        wallet,
        identity_addr: info.as_ref().map(|r| r.identity_addr.to_string()),
        country: info.and_then(|r| r.country),
    })
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let owner = OWNER.load(deps.storage)?;
    let tir = TRUSTED_ISSUERS_ADDR.may_load(deps.storage)?.flatten();
    let ctr = CLAIM_TOPICS_ADDR.may_load(deps.storage)?.flatten();
    let irs = IDENTITY_STORAGE_ADDR.may_load(deps.storage)?.flatten();
    Ok(ConfigResponse {
        owner: owner.to_string(),
        trusted_issuers: tir.map(|a| a.to_string()),
        claim_topics: ctr.map(|a| a.to_string()),
        identity_storage: irs.map(|a| a.to_string()),
    })
}

fn query_contains(deps: Deps, wallet: String) -> StdResult<ContainsResponse> {
    let w = deps.api.addr_validate(&wallet)?;
    let contains = REGISTRY.may_load(deps.storage, &w)?.is_some();
    Ok(ContainsResponse { contains })
}

fn query_trusted_issuers_registry(deps: Deps) -> StdResult<RegistryAddressResponse> {
    let addr = TRUSTED_ISSUERS_ADDR.may_load(deps.storage)?.flatten();
    Ok(RegistryAddressResponse {
        address: addr.map(|a| a.to_string()),
    })
}

fn query_claim_topics_registry(deps: Deps) -> StdResult<RegistryAddressResponse> {
    let addr = CLAIM_TOPICS_ADDR.may_load(deps.storage)?.flatten();
    Ok(RegistryAddressResponse {
        address: addr.map(|a| a.to_string()),
    })
}

fn only_owner(deps: Deps, info: &MessageInfo) -> Result<(), ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "migrate"))
}
