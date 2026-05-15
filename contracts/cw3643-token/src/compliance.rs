use crate::msg::KycStatus;
use crate::state::*;
use cosmwasm_std::{Addr, Deps, StdResult, Uint128};

// Compliance module: simple example rules
// - optional per-address jurisdiction (not implemented here, left as extension)
// - simple transfer limit check

pub fn check_transfer_limit(
    _deps: &Deps,
    _from: &Addr,
    _to: &Addr,
    amount: Uint128,
) -> StdResult<()> {
    // In production, this would consult per-address limits, jurisdiction rules, and sanitizer.
    // For this minimal module, we only check that amount is non-zero.
    if amount == Uint128::zero() {
        return Err(cosmwasm_std::StdError::generic_err(
            "transfer amount must be > 0",
        ));
    }
    Ok(())
}

pub fn check_kyc_status(deps: &Deps, addr: &Addr) -> StdResult<bool> {
    match KYC.may_load(deps.storage, addr)? {
        Some(KycStatus::Approved) => Ok(true),
        _ => Ok(false),
    }
}
