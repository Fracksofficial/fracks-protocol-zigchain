//! Trusted Issuers Registry Contract
//! 
//! This contract maintains a whitelist of trusted claim issuers and their allowed topics.
//! Only the owner can modify the registry.

use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:trusted-issuers-registry-cw";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

// ERC-3643 Constraints (from official Solidity implementation)
const MAX_ISSUERS: usize = 50;
const MAX_TOPICS_PER_ISSUER: usize = 15;

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
        ExecuteMsg::AddIssuer { issuer, topics } => {
            only_owner(deps.as_ref(), &info)?;
            let i = deps.api.addr_validate(&issuer)?;
            
            // ERC-3643 Constraint: Cannot set empty topics
            if topics.is_empty() {
                return Err(ContractError::EmptyTopics {});
            }
            
            // ERC-3643 Constraint: Max 15 topics per issuer (gas limit consideration)
            if topics.len() > MAX_TOPICS_PER_ISSUER {
                return Err(ContractError::TooManyTopicsPerIssuer {
                    max: MAX_TOPICS_PER_ISSUER,
                });
            }
            
            // ERC-3643 Constraint: Max 50 trusted issuers (gas limit consideration)
            let issuer_count = ISSUERS
                .keys(deps.storage, None, None, cosmwasm_std::Order::Ascending)
                .count();
            if issuer_count >= MAX_ISSUERS {
                return Err(ContractError::TooManyIssuers { max: MAX_ISSUERS });
            }
            
            // Save issuer with topics
            ISSUERS.save(deps.storage, &i, &IssuerTopics { topics: topics.clone() })?;
            
            // Update reverse index: add issuer to each topic
            for topic in &topics {
                let mut issuers = TOPICS_TO_ISSUERS
                    .may_load(deps.storage, *topic)?
                    .unwrap_or_default();
                if !issuers.contains(&i) {
                    issuers.push(i.clone());
                    TOPICS_TO_ISSUERS.save(deps.storage, *topic, &issuers)?;
                }
            }
            
            Ok(Response::new()
                .add_attribute("action", "add_issuer")
                .add_attribute("issuer", issuer))
        }
        ExecuteMsg::UpdateIssuerTopics { issuer, topics } => {
            only_owner(deps.as_ref(), &info)?;
            let i = deps.api.addr_validate(&issuer)?;
            
            // ERC-3643 Constraint: Cannot set empty topics
            if topics.is_empty() {
                return Err(ContractError::EmptyTopics {});
            }
            
            // ERC-3643 Constraint: Max 15 topics per issuer
            if topics.len() > MAX_TOPICS_PER_ISSUER {
                return Err(ContractError::TooManyTopicsPerIssuer {
                    max: MAX_TOPICS_PER_ISSUER,
                });
            }
            
            // Get old topics to clean up reverse index
            let old_topics = ISSUERS
                .may_load(deps.storage, &i)?
                .map(|x| x.topics)
                .unwrap_or_default();
            
            // Remove issuer from old topics in reverse index
            for topic in &old_topics {
                if let Some(mut issuers) = TOPICS_TO_ISSUERS.may_load(deps.storage, *topic)? {
                    issuers.retain(|addr| addr != &i);
                    if issuers.is_empty() {
                        TOPICS_TO_ISSUERS.remove(deps.storage, *topic);
                    } else {
                        TOPICS_TO_ISSUERS.save(deps.storage, *topic, &issuers)?;
                    }
                }
            }
            
            // Save new topics
            ISSUERS.save(deps.storage, &i, &IssuerTopics { topics: topics.clone() })?;
            
            // Add issuer to new topics in reverse index
            for topic in &topics {
                let mut issuers = TOPICS_TO_ISSUERS
                    .may_load(deps.storage, *topic)?
                    .unwrap_or_default();
                if !issuers.contains(&i) {
                    issuers.push(i.clone());
                    TOPICS_TO_ISSUERS.save(deps.storage, *topic, &issuers)?;
                }
            }
            
            Ok(Response::new()
                .add_attribute("action", "update_issuer_topics")
                .add_attribute("issuer", issuer))
        }
        ExecuteMsg::RemoveIssuer { issuer } => {
            only_owner(deps.as_ref(), &info)?;
            let i = deps.api.addr_validate(&issuer)?;
            
            // Get issuer's topics to clean up reverse index
            if let Some(issuer_topics) = ISSUERS.may_load(deps.storage, &i)? {
                // Remove issuer from all topics in reverse index
                for topic in &issuer_topics.topics {
                    if let Some(mut issuers) = TOPICS_TO_ISSUERS.may_load(deps.storage, *topic)? {
                        issuers.retain(|addr| addr != &i);
                        if issuers.is_empty() {
                            TOPICS_TO_ISSUERS.remove(deps.storage, *topic);
                        } else {
                            TOPICS_TO_ISSUERS.save(deps.storage, *topic, &issuers)?;
                        }
                    }
                }
            }
            
            // Remove issuer
            ISSUERS.remove(deps.storage, &i);
            
            Ok(Response::new()
                .add_attribute("action", "remove_issuer")
                .add_attribute("issuer", issuer))
        }
        ExecuteMsg::UpdateOwner { owner } => {
            only_owner(deps.as_ref(), &info)?;
            let o = deps.api.addr_validate(&owner)?;
            OWNER.save(deps.storage, &o)?;
            Ok(Response::new()
                .add_attribute("action", "update_owner")
                .add_attribute("owner", owner))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::IssuerTopics { issuer } => to_json_binary(&query_issuer_topics(deps, issuer)?),
        QueryMsg::IsIssuerForTopic { issuer, topic } => {
            to_json_binary(&query_is_issuer_for_topic(deps, issuer, topic)?)
        }
        QueryMsg::AllIssuers {} => to_json_binary(&query_all_issuers(deps)?),
        QueryMsg::TrustedIssuersForTopic { topic } => {
            to_json_binary(&query_trusted_issuers_for_topic(deps, topic)?)
        }
    }
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "migrate"))
}

// Query handlers

fn query_issuer_topics(deps: Deps, issuer: String) -> StdResult<IssuerTopicsResponse> {
    let i = deps.api.addr_validate(&issuer)?;
    let topics = ISSUERS
        .may_load(deps.storage, &i)?
        .map(|x| x.topics)
        .unwrap_or_default();
    Ok(IssuerTopicsResponse { issuer, topics })
}

fn query_is_issuer_for_topic(
    deps: Deps,
    issuer: String,
    topic: u32,
) -> StdResult<IsIssuerForTopicResponse> {
    let i = deps.api.addr_validate(&issuer)?;
    let allowed = ISSUERS
        .may_load(deps.storage, &i)?
        .map(|t| t.topics.contains(&topic))
        .unwrap_or(false);
    Ok(IsIssuerForTopicResponse {
        issuer,
        topic,
        allowed,
    })
}

fn query_all_issuers(deps: Deps) -> StdResult<AllIssuersResponse> {
    let mut res: Vec<IssuerTopicsResponse> = vec![];
    let mut it = ISSUERS.keys(deps.storage, None, None, cosmwasm_std::Order::Ascending);
    while let Some(key) = it.next() {
        let addr = key?;
        let topics = ISSUERS.load(deps.storage, &addr)?.topics;
        res.push(IssuerTopicsResponse {
            issuer: addr.to_string(),
            topics,
        });
    }
    Ok(AllIssuersResponse { issuers: res })
}

// ERC-3643 v4.0: Gas-optimized query for isVerified()
// Returns only issuers that support the specific topic
fn query_trusted_issuers_for_topic(deps: Deps, topic: u32) -> StdResult<TrustedIssuersForTopicResponse> {
    let issuers = TOPICS_TO_ISSUERS
        .may_load(deps.storage, topic)?
        .unwrap_or_default()
        .iter()
        .map(|addr| addr.to_string())
        .collect();
    
    Ok(TrustedIssuersForTopicResponse { issuers })
}

// Helper functions

fn only_owner(deps: Deps, info: &MessageInfo) -> Result<(), ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}
