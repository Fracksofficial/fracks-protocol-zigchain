//! Claim Topics Registry Contract
//! 
//! This contract manages the list of required claim topics for token holders.
//! Only the owner can modify the required topics list.

use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:claim-topics-registry-cw";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

// ERC-3643 Constraint: Max 15 claim topics (gas limit consideration)
const MAX_CLAIM_TOPICS: usize = 15;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    OWNER.save(deps.storage, &msg.owner)?;
    REQUIRED_TOPICS.save(deps.storage, &msg.required_topics)?;
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
        ExecuteMsg::SetRequiredTopics { topics } => {
            only_owner(deps.as_ref(), &info)?;
            
            // ERC-3643 Constraint: Cannot require more than 15 topics (gas limit consideration)
            if topics.len() > MAX_CLAIM_TOPICS {
                return Err(ContractError::TooManyTopics {
                    max: MAX_CLAIM_TOPICS,
                });
            }
            
            REQUIRED_TOPICS.save(deps.storage, &topics)?;
            Ok(Response::new().add_attribute("action", "set_required_topics"))
        }
        ExecuteMsg::UpdateOwner { owner } => {
            only_owner(deps.as_ref(), &info)?;
            OWNER.save(deps.storage, &owner)?;
            Ok(Response::new()
                .add_attribute("action", "update_owner")
                .add_attribute("owner", owner))
        }
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::RequiredTopics {} => to_json_binary(&RequiredTopicsResponse {
            topics: REQUIRED_TOPICS.load(deps.storage)?,
        }),
        QueryMsg::Owner {} => to_json_binary(&OwnerResponse {
            owner: OWNER.load(deps.storage)?,
        }),
    }
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "migrate"))
}

// Helper functions

fn only_owner(deps: Deps, info: &MessageInfo) -> Result<(), ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender.to_string() != owner {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}
