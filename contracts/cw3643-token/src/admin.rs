use crate::state::*;
use cosmwasm_std::{Deps, MessageInfo};

pub fn only_owner(deps: &Deps, info: &MessageInfo) -> Result<(), crate::error::ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender != owner {
        return Err(crate::error::ContractError::Unauthorized {});
    }
    Ok(())
}

pub fn only_issuer(deps: &Deps, info: &MessageInfo) -> Result<(), crate::error::ContractError> {
    let issuer = ISSUER.load(deps.storage)?;
    if info.sender != issuer {
        return Err(crate::error::ContractError::Unauthorized {});
    }
    Ok(())
}

pub fn only_controller(deps: &Deps, info: &MessageInfo) -> Result<(), crate::error::ContractError> {
    let controller = CONTROLLER.load(deps.storage)?;
    if info.sender != controller {
        return Err(crate::error::ContractError::Unauthorized {});
    }
    Ok(())
}
