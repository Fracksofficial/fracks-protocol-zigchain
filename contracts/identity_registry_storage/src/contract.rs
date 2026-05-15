use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, Addr,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:identity-registry-storage-cw";
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
    LINKED_REGISTRIES.save(deps.storage, &vec![])?;
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
        ExecuteMsg::AddIdentity {
            wallet,
            identity,
            country,
        } => execute_add_identity(deps, info, wallet, identity, country),
        ExecuteMsg::ModifyIdentity { wallet, identity } => {
            execute_modify_identity(deps, info, wallet, identity)
        }
        ExecuteMsg::ModifyCountry { wallet, country } => {
            execute_modify_country(deps, info, wallet, country)
        }
        ExecuteMsg::RemoveIdentity { wallet } => execute_remove_identity(deps, info, wallet),
        ExecuteMsg::BindIdentityRegistry { registry } => {
            execute_bind_registry(deps, info, registry)
        }
        ExecuteMsg::UnbindIdentityRegistry { registry } => {
            execute_unbind_registry(deps, info, registry)
        }
        ExecuteMsg::TransferOwnership { new_owner } => {
            execute_transfer_ownership(deps, info, new_owner)
        }
    }
}

fn is_agent(deps: Deps, sender: &Addr) -> StdResult<bool> {
    let registries = LINKED_REGISTRIES.load(deps.storage)?;
    Ok(registries.contains(sender))
}

fn is_owner_or_agent(deps: Deps, sender: &Addr) -> StdResult<bool> {
    let owner = OWNER.load(deps.storage)?;
    if sender == &owner {
        return Ok(true);
    }
    is_agent(deps, sender)
}

fn execute_add_identity(
    deps: DepsMut,
    info: MessageInfo,
    wallet: String,
    identity: String,
    country: u16,
) -> Result<Response, ContractError> {
    if !is_owner_or_agent(deps.as_ref(), &info.sender)? {
        return Err(ContractError::Unauthorized {});
    }

    let wallet_addr = deps.api.addr_validate(&wallet)?;
    let identity_addr = deps.api.addr_validate(&identity)?;

    if IDENTITIES.has(deps.storage, &wallet_addr) {
        return Err(ContractError::IdentityAlreadyStored {});
    }

    IDENTITIES.save(
        deps.storage,
        &wallet_addr,
        &Identity {
            identity: identity_addr.clone(),
            country,
        },
    )?;

    Ok(Response::new()
        .add_attribute("action", "add_identity")
        .add_attribute("wallet", wallet)
        .add_attribute("identity", identity_addr))
}

fn execute_modify_identity(
    deps: DepsMut,
    info: MessageInfo,
    wallet: String,
    identity: String,
) -> Result<Response, ContractError> {
    if !is_owner_or_agent(deps.as_ref(), &info.sender)? {
        return Err(ContractError::Unauthorized {});
    }

    let wallet_addr = deps.api.addr_validate(&wallet)?;
    let identity_addr = deps.api.addr_validate(&identity)?;

    let mut stored = IDENTITIES
        .load(deps.storage, &wallet_addr)
        .map_err(|_| ContractError::IdentityNotStored {})?;

    stored.identity = identity_addr.clone();
    IDENTITIES.save(deps.storage, &wallet_addr, &stored)?;

    Ok(Response::new()
        .add_attribute("action", "modify_identity")
        .add_attribute("wallet", wallet)
        .add_attribute("identity", identity_addr))
}

fn execute_modify_country(
    deps: DepsMut,
    info: MessageInfo,
    wallet: String,
    country: u16,
) -> Result<Response, ContractError> {
    if !is_owner_or_agent(deps.as_ref(), &info.sender)? {
        return Err(ContractError::Unauthorized {});
    }

    let wallet_addr = deps.api.addr_validate(&wallet)?;

    let mut stored = IDENTITIES
        .load(deps.storage, &wallet_addr)
        .map_err(|_| ContractError::IdentityNotStored {})?;

    stored.country = country;
    IDENTITIES.save(deps.storage, &wallet_addr, &stored)?;

    Ok(Response::new()
        .add_attribute("action", "modify_country")
        .add_attribute("wallet", wallet)
        .add_attribute("country", country.to_string()))
}

fn execute_remove_identity(
    deps: DepsMut,
    info: MessageInfo,
    wallet: String,
) -> Result<Response, ContractError> {
    if !is_owner_or_agent(deps.as_ref(), &info.sender)? {
        return Err(ContractError::Unauthorized {});
    }

    let wallet_addr = deps.api.addr_validate(&wallet)?;

    if !IDENTITIES.has(deps.storage, &wallet_addr) {
        return Err(ContractError::IdentityNotStored {});
    }

    IDENTITIES.remove(deps.storage, &wallet_addr);

    Ok(Response::new()
        .add_attribute("action", "remove_identity")
        .add_attribute("wallet", wallet))
}

fn execute_bind_registry(
    deps: DepsMut,
    info: MessageInfo,
    registry: String,
) -> Result<Response, ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(ContractError::Unauthorized {});
    }

    let registry_addr = deps.api.addr_validate(&registry)?;
    let mut registries = LINKED_REGISTRIES.load(deps.storage)?;

    if registries.len() >= 300 {
        return Err(ContractError::TooManyRegistries {});
    }

    if !registries.contains(&registry_addr) {
        registries.push(registry_addr.clone());
        LINKED_REGISTRIES.save(deps.storage, &registries)?;
    }

    Ok(Response::new()
        .add_attribute("action", "bind_registry")
        .add_attribute("registry", registry))
}

fn execute_unbind_registry(
    deps: DepsMut,
    info: MessageInfo,
    registry: String,
) -> Result<Response, ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(ContractError::Unauthorized {});
    }

    let registry_addr = deps.api.addr_validate(&registry)?;
    let mut registries = LINKED_REGISTRIES.load(deps.storage)?;

    if let Some(pos) = registries.iter().position(|r| r == &registry_addr) {
        registries.remove(pos);
        LINKED_REGISTRIES.save(deps.storage, &registries)?;
    } else {
        return Err(ContractError::RegistryNotBound {});
    }

    Ok(Response::new()
        .add_attribute("action", "unbind_registry")
        .add_attribute("registry", registry))
}

fn execute_transfer_ownership(
    deps: DepsMut,
    info: MessageInfo,
    new_owner: String,
) -> Result<Response, ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(ContractError::Unauthorized {});
    }

    let new_owner_addr = deps.api.addr_validate(&new_owner)?;
    OWNER.save(deps.storage, &new_owner_addr)?;

    Ok(Response::new()
        .add_attribute("action", "transfer_ownership")
        .add_attribute("new_owner", new_owner))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::StoredIdentity { wallet } => to_json_binary(&query_stored_identity(deps, wallet)?),
        QueryMsg::StoredCountry { wallet } => to_json_binary(&query_stored_country(deps, wallet)?),
        QueryMsg::LinkedRegistries {} => to_json_binary(&query_linked_registries(deps)?),
        QueryMsg::Owner {} => to_json_binary(&query_owner(deps)?),
    }
}

fn query_stored_identity(deps: Deps, wallet: String) -> StdResult<IdentityResponse> {
    let wallet_addr = deps.api.addr_validate(&wallet)?;
    let identity = IDENTITIES.load(deps.storage, &wallet_addr)?;
    Ok(IdentityResponse {
        identity: identity.identity,
        country: identity.country,
    })
}

fn query_stored_country(deps: Deps, wallet: String) -> StdResult<CountryResponse> {
    let wallet_addr = deps.api.addr_validate(&wallet)?;
    let identity = IDENTITIES.load(deps.storage, &wallet_addr)?;
    Ok(CountryResponse {
        country: identity.country,
    })
}

fn query_linked_registries(deps: Deps) -> StdResult<LinkedRegistriesResponse> {
    let registries = LINKED_REGISTRIES.load(deps.storage)?;
    Ok(LinkedRegistriesResponse { registries })
}

fn query_owner(deps: Deps) -> StdResult<OwnerResponse> {
    let owner = OWNER.load(deps.storage)?;
    Ok(OwnerResponse { owner })
}
