//! Compliance Contract
//!
//! This contract enforces compliance rules for token transfers including
//! per-address limits and country-based restrictions using the identity registry.
//! Now supports modular compliance architecture per ERC-3643 T-REX standard.

use cosmwasm_std::{
    entry_point, to_json_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo, Response,
    StdResult, Uint128, WasmMsg,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::module::ModuleExecuteMsg;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:compliance-contract-cw";
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
    let ir = msg
        .identity_registry
        .and_then(|s| deps.api.addr_validate(&s).ok());
    IDENTITY_REGISTRY_ADDR.save(deps.storage, &ir)?;
    ALLOWED_COUNTRIES.save(deps.storage, &None)?;
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
        // Module management
        ExecuteMsg::AddModule { module, name } => {
            only_owner(deps.as_ref(), &info)?;
            execute_add_module(deps, module, name)
        }
        ExecuteMsg::RemoveModule { module } => {
            only_owner(deps.as_ref(), &info)?;
            execute_remove_module(deps, module)
        }

        // Legacy compliance rules
        ExecuteMsg::SetPerAddressLimit { address, limit } => {
            only_owner(deps.as_ref(), &info)?;
            let addr = deps.api.addr_validate(&address)?;
            PER_ADDR_LIMIT.save(deps.storage, &addr, &limit)?;
            Ok(Response::new()
                .add_attribute("action", "set_per_address_limit")
                .add_attribute("address", address))
        }
        ExecuteMsg::SetAllowedCountries { countries } => {
            only_owner(deps.as_ref(), &info)?;
            ALLOWED_COUNTRIES.save(deps.storage, &countries)?;
            Ok(Response::new().add_attribute("action", "set_allowed_countries"))
        }

        // TREX callback functions
        ExecuteMsg::Transferred { from, to, amount } => {
            execute_transferred(deps, from, to, amount)
        }
        ExecuteMsg::Created { to, amount } => {
            execute_created(deps, to, amount)
        }
        ExecuteMsg::Destroyed { from, amount } => {
            execute_destroyed(deps, from, amount)
        }

        // Configuration
        ExecuteMsg::SetIdentityRegistry { addr } => {
            only_owner(deps.as_ref(), &info)?;
            let parsed = addr.and_then(|s| deps.api.addr_validate(&s).ok());
            IDENTITY_REGISTRY_ADDR.save(deps.storage, &parsed)?;
            Ok(Response::new().add_attribute("action", "set_identity_registry"))
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
        QueryMsg::CanTransfer {
            token: _,
            from,
            to,
            amount,
        } => to_json_binary(&query_can_transfer(deps, from, to, amount)?),
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::Modules {} => to_json_binary(&query_modules(deps)?),
        QueryMsg::ModuleInfo { module } => to_json_binary(&query_module_info(deps, module)?),
    }
}

fn query_can_transfer(
    deps: Deps,
    from: String,
    to: String,
    amount: Uint128,
) -> StdResult<CanTransferResponse> {
    let from_addr = deps.api.addr_validate(&from)?;
    let to_addr = deps.api.addr_validate(&to)?;

    // Per-address limit check for sender
    if let Some(limit) = PER_ADDR_LIMIT.may_load(deps.storage, &from_addr)?.flatten() {
        if amount > limit {
            return Ok(CanTransferResponse {
                allowed: false,
                reason: Some("amount exceeds per-address limit".to_string()),
            });
        }
    }

    // Country whitelist check using IR if configured
    let allowed_countries = ALLOWED_COUNTRIES.load(deps.storage)?;
    if let Some(list) = allowed_countries {
        if let Some(ir) = IDENTITY_REGISTRY_ADDR.may_load(deps.storage)?.flatten() {
            // Query countries for from and to
            let from_country: Option<String> = query_country(deps, &ir, &from_addr)?;
            let to_country: Option<String> = query_country(deps, &ir, &to_addr)?;
            if from_country.is_none() || to_country.is_none() {
                return Ok(CanTransferResponse {
                    allowed: false,
                    reason: Some("missing country info".to_string()),
                });
            }
            let fc = from_country.unwrap();
            let tc = to_country.unwrap();
            if !list.contains(&fc) || !list.contains(&tc) {
                return Ok(CanTransferResponse {
                    allowed: false,
                    reason: Some("country not allowed".to_string()),
                });
            }
        }
    }

    Ok(CanTransferResponse {
        allowed: true,
        reason: None,
    })
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let owner = OWNER.load(deps.storage)?;
    let ir = IDENTITY_REGISTRY_ADDR
        .may_load(deps.storage)?
        .flatten()
        .map(|a| a.to_string());
    let allowed = ALLOWED_COUNTRIES.load(deps.storage)?;
    let module_count = MODULES
        .keys(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .count() as u32;
    Ok(ConfigResponse {
        owner: owner.to_string(),
        identity_registry: ir,
        allowed_countries: allowed,
        module_count,
    })
}

fn query_country(deps: Deps, ir: &Addr, wallet: &Addr) -> StdResult<Option<String>> {
    // Use the IR Identity query to get country
    #[derive(serde::Serialize)]
    #[serde(rename_all = "snake_case")]
    enum IrQuery<'a> {
        Identity { wallet: &'a str },
    }

    #[derive(serde::Deserialize)]
    struct IdentityResp {
        country: Option<String>,
    }

    let resp: IdentityResp = deps.querier.query_wasm_smart(
        ir.clone(),
        &IrQuery::Identity {
            wallet: wallet.as_str(),
        },
    )?;
    Ok(resp.country)
}

fn only_owner(deps: Deps, info: &MessageInfo) -> Result<(), ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(ContractError::Unauthorized {});
    }
    Ok(())
}

// Module management functions
fn execute_add_module(
    deps: DepsMut,
    module: String,
    name: String,
) -> Result<Response, ContractError> {
    let module_addr = deps.api.addr_validate(&module)?;

    // Check if module already exists
    if MODULES.has(deps.storage, &module_addr) {
        return Err(ContractError::CustomError {
            msg: "Module already exists".to_string(),
        });
    }

    // Check if name is already taken
    if MODULE_NAMES.has(deps.storage, &name) {
        return Err(ContractError::CustomError {
            msg: "Module name already exists".to_string(),
        });
    }

    // Add module
    let module_info = crate::state::ModuleInfo { name: name.clone() };
    MODULES.save(deps.storage, &module_addr, &module_info)?;
    MODULE_NAMES.save(deps.storage, &name, &module_addr)?;

    Ok(Response::new()
        .add_attribute("action", "add_module")
        .add_attribute("module", module)
        .add_attribute("name", name))
}

fn execute_remove_module(
    deps: DepsMut,
    module: String,
) -> Result<Response, ContractError> {
    let module_addr = deps.api.addr_validate(&module)?;

    // Get module info to remove name mapping
    if let Some(module_info) = MODULES.may_load(deps.storage, &module_addr)? {
        MODULE_NAMES.remove(deps.storage, &module_info.name);
    }

    // Remove module
    MODULES.remove(deps.storage, &module_addr);

    Ok(Response::new()
        .add_attribute("action", "remove_module")
        .add_attribute("module", module))
}

// TREX callback functions
fn execute_transferred(
    deps: DepsMut,
    from: String,
    to: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let mut response = Response::new()
        .add_attribute("action", "transferred")
        .add_attribute("from", from.clone())
        .add_attribute("to", to.clone())
        .add_attribute("amount", amount.to_string());

    // Call all modules
    let modules: Vec<_> = MODULES
        .keys(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .collect::<StdResult<_>>()?;

    for module_addr in modules {
        let msg = WasmMsg::Execute {
            contract_addr: module_addr.to_string(),
            msg: to_json_binary(&ModuleExecuteMsg::Transferred {
                from: from.clone(),
                to: to.clone(),
                amount,
            })?,
            funds: vec![],
        };
        response = response.add_message(msg);
    }

    Ok(response)
}

fn execute_created(
    deps: DepsMut,
    to: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let mut response = Response::new()
        .add_attribute("action", "created")
        .add_attribute("to", to.clone())
        .add_attribute("amount", amount.to_string());

    // Call all modules
    let modules: Vec<_> = MODULES
        .keys(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .collect::<StdResult<_>>()?;

    for module_addr in modules {
        let msg = WasmMsg::Execute {
            contract_addr: module_addr.to_string(),
            msg: to_json_binary(&ModuleExecuteMsg::Created {
                to: to.clone(),
                amount,
            })?,
            funds: vec![],
        };
        response = response.add_message(msg);
    }

    Ok(response)
}

fn execute_destroyed(
    deps: DepsMut,
    from: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let mut response = Response::new()
        .add_attribute("action", "destroyed")
        .add_attribute("from", from.clone())
        .add_attribute("amount", amount.to_string());

    // Call all modules
    let modules: Vec<_> = MODULES
        .keys(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .collect::<StdResult<_>>()?;

    for module_addr in modules {
        let msg = WasmMsg::Execute {
            contract_addr: module_addr.to_string(),
            msg: to_json_binary(&ModuleExecuteMsg::Destroyed {
                from: from.clone(),
                amount,
            })?,
            funds: vec![],
        };
        response = response.add_message(msg);
    }

    Ok(response)
}

// Query functions
fn query_modules(deps: Deps) -> StdResult<ModulesResponse> {
    let modules: StdResult<Vec<_>> = MODULES
        .range(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .map(|item| {
            let (addr, info) = item?;
            Ok(crate::msg::ModuleInfo {
                address: addr.to_string(),
                name: info.name,
            })
        })
        .collect();

    Ok(ModulesResponse {
        modules: modules?,
    })
}

fn query_module_info(deps: Deps, module: String) -> StdResult<crate::msg::ModuleInfoResponse> {
    let module_addr = deps.api.addr_validate(&module)?;
    let info = MODULES.may_load(deps.storage, &module_addr)?;
    Ok(crate::msg::ModuleInfoResponse {
        info: info.map(|i| crate::msg::ModuleInfo {
            address: module,
            name: i.name,
        }),
    })
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("action", "migrate"))
}
