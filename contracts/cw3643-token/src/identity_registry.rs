use crate::msg::KycStatus;
use crate::state::*;
use cosmwasm_std::{Addr, Deps, DepsMut, StdResult};

// Identity registry helpers
// Manages KYC statuses stored in `KYC` map in `state.rs`.

pub fn set_kyc(deps: DepsMut, addr: Addr, status: KycStatus) -> StdResult<()> {
    KYC.save(deps.storage, &addr, &status)?;
    Ok(())
}

pub fn is_approved(deps: &Deps, addr: &Addr) -> StdResult<bool> {
    match KYC.may_load(deps.storage, addr)? {
        Some(KycStatus::Approved) => Ok(true),
        _ => Ok(false),
    }
}

pub fn query_status(deps: Deps, addr: &Addr) -> StdResult<KycStatus> {
    Ok(KYC
        .may_load(deps.storage, addr)?
        .unwrap_or(KycStatus::Pending))
}
