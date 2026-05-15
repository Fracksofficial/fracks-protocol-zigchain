//! OnChainID Contract
//! 
//! This contract implements decentralized identity with claims management.
//! Claims are assertions about the identity holder issued by trusted third parties.

use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:onchainid-cw";
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
    CLAIM_SEQ.save(deps.storage, &0u64)?;
    
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::AddClaim {
            topic,
            issuer,
            data,
            expires_at,
        } => {
            let issuer_addr = deps.api.addr_validate(&issuer)?;
            
            // SECURITY: Only the claim issuer can add claims (anti-forgery)
            // This prevents anyone from forging claims on behalf of others
            // TIR validation happens at Identity Registry level during token transfers
            if info.sender != issuer_addr {
                return Err(ContractError::Unauthorized {});
            }
            
            let mut seq = CLAIM_SEQ.load(deps.storage)?;
            seq += 1;
            CLAIM_SEQ.save(deps.storage, &seq)?;
            let rec = ClaimRecord {
                id: seq,
                topic,
                issuer: issuer_addr,
                data,
                issued_at: env.block.time.seconds(),
                expires_at,
                revoked: false,
            };
            CLAIMS.save(deps.storage, (topic, seq), &rec)?;
            Ok(Response::new()
                .add_attribute("action", "add_claim")
                .add_attribute("topic", topic.to_string())
                .add_attribute("id", seq.to_string()))
        }
        ExecuteMsg::RevokeClaim { topic, claim_id } => {
            let mut rec = CLAIMS.load(deps.storage, (topic, claim_id))?;
            let owner = OWNER.load(deps.storage)?;
            if info.sender != rec.issuer && info.sender != owner {
                return Err(ContractError::Unauthorized {});
            }
            rec.revoked = true;
            CLAIMS.save(deps.storage, (topic, claim_id), &rec)?;
            Ok(Response::new()
                .add_attribute("action", "revoke_claim")
                .add_attribute("topic", topic.to_string())
                .add_attribute("id", claim_id.to_string()))
        }
        ExecuteMsg::UpdateOwner { owner } => {
            let o = deps.api.addr_validate(&owner)?;
            only_owner(deps.as_ref(), &info)?;
            OWNER.save(deps.storage, &o)?;
            Ok(Response::new()
                .add_attribute("action", "update_owner")
                .add_attribute("owner", owner))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::ClaimsByTopic { topic } => to_json_binary(&query_claims_by_topic(deps, topic)?),
        QueryMsg::HasValidClaim {
            topic,
            issuer_whitelist,
            at_time,
        } => to_json_binary(&query_has_valid_claim(
            deps,
            env,
            topic,
            issuer_whitelist,
            at_time,
        )?),
    }
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "migrate"))
}

// Query handlers

fn query_claims_by_topic(deps: Deps, topic: u32) -> StdResult<Vec<ClaimResponse>> {
    let mut res: Vec<ClaimResponse> = vec![];
    let prefix = CLAIMS.prefix(topic);
    let mut it = prefix.range(deps.storage, None, None, cosmwasm_std::Order::Ascending);
    while let Some(item) = it.next() {
        let (_k, v) = item?;
        res.push(ClaimResponse {
            id: v.id,
            topic: v.topic,
            issuer: v.issuer.to_string(),
            data: v.data,
            issued_at: v.issued_at,
            expires_at: v.expires_at,
            revoked: v.revoked,
        });
    }
    Ok(res)
}

fn query_has_valid_claim(
    deps: Deps,
    env: Env,
    topic: u32,
    issuer_whitelist: Option<Vec<String>>,
    at_time: Option<u64>,
) -> StdResult<HasValidClaimResponse> {
    let t = at_time.unwrap_or(env.block.time.seconds());
    let mut ok = false;
    let allowed: Option<Vec<String>> = issuer_whitelist;
    let prefix = CLAIMS.prefix(topic);
    let mut it = prefix.range(deps.storage, None, None, cosmwasm_std::Order::Ascending);
    'outer: while let Some(item) = it.next() {
        let (_k, v) = item?;
        if v.revoked {
            continue;
        }
        if let Some(exp) = v.expires_at {
            if exp <= t {
                continue;
            }
        }
        if let Some(list) = &allowed {
            if !list.iter().any(|s| s == &v.issuer.to_string()) {
                continue;
            }
        }
        ok = true;
        break 'outer;
    }
    Ok(HasValidClaimResponse { valid: ok })
}

// Helper functions

fn only_owner(deps: Deps, info: &MessageInfo) -> Result<(), ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}
