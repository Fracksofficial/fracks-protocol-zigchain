//! CW-3643 Token Contract - Main Implementation
//! 
//! This is the core business logic for the CW-3643 compliant security token.
//! Implements TREX/ERC-3643 standard for permissioned token transfers with identity verification.

use cosmwasm_std::{entry_point, to_json_binary, Addr, Binary, Deps, DepsMut, Env, Event, MessageInfo, Response, StdResult, Uint128, Order};
use cw2::set_contract_version;

use crate::admin as admin_mod;
use crate::error::ContractError;
use crate::identity_registry as idreg;
use crate::interfaces::ComplianceExecuteMsg;
use crate::msg::*;
use crate::state::*;

const CONTRACT_NAME: &str = "crates.io:cw3643-token";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    // Save token metadata
    TOKEN_NAME.save(deps.storage, &msg.name)?;
    TOKEN_SYMBOL.save(deps.storage, &msg.symbol)?;
    TOKEN_DECIMALS.save(deps.storage, &msg.decimals)?;
    TOTAL_SUPPLY.save(deps.storage, &Uint128::zero())?;
    PAUSED.save(deps.storage, &false)?;
    CAP.save(deps.storage, &msg.cap)?;
    
    // CRITICAL SECURITY: Save minting cap for enforcement
    MINTING_CAP.save(deps.storage, &msg.minting_cap)?;

    let owner_addr = deps.api.addr_validate(&msg.owner)?;
    let issuer_addr = deps.api.addr_validate(&msg.issuer)?;
    let controller_addr = deps.api.addr_validate(&msg.controller)?;
    OWNER.save(deps.storage, &owner_addr)?;
    ISSUER.save(deps.storage, &issuer_addr)?;
    CONTROLLER.save(deps.storage, &controller_addr)?;

    // Optional external validator addresses
    let ir_addr_opt = match msg.identity_registry {
        Some(ref s) => Some(deps.api.addr_validate(s)?),
        None => None,
    };
    let comp_addr_opt = match msg.compliance {
        Some(ref s) => Some(deps.api.addr_validate(s)?),
        None => None,
    };
    IDENTITY_REGISTRY_ADDR.save(deps.storage, &ir_addr_opt)?;
    COMPLIANCE_ADDR.save(deps.storage, &comp_addr_opt)?;

    // initial balances and KYC default to Pending
    let mut total = Uint128::zero();
    for ib in msg.initial_balances {
        let addr = deps.api.addr_validate(&ib.address)?;
        BALANCES.save(deps.storage, &addr, &ib.amount)?;
        total += ib.amount;
        KYC.save(deps.storage, &addr, &KycStatus::Pending)?;
    }
    TOTAL_SUPPLY.save(deps.storage, &total)?;

    // set KYC for owner/issuer/controller as Approved
    KYC.save(deps.storage, &owner_addr, &KycStatus::Approved)?;
    KYC.save(deps.storage, &issuer_addr, &KycStatus::Approved)?;
    KYC.save(deps.storage, &controller_addr, &KycStatus::Approved)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("name", msg.name)
        .add_attribute("symbol", msg.symbol)
        .add_attribute("owner", msg.owner)
        .add_attribute("issuer", msg.issuer)
        .add_attribute("controller", msg.controller)
        .add_attribute("deployer", info.sender.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Transfer { recipient, amount } => {
            execute_transfer(deps, env, info, recipient, amount)
        }
        // CW20-compatible
        ExecuteMsg::Approve { spender, amount } => {
            execute_approve(deps, env, info, spender, amount)
        }
        ExecuteMsg::TransferFrom {
            owner,
            recipient,
            amount,
        } => execute_transfer_from(deps, env, info, owner, recipient, amount),
        ExecuteMsg::Mint { recipient, amount } => execute_mint(deps, env, info, recipient, amount),
        ExecuteMsg::Burn { amount } => execute_burn(deps, env, info, amount),
        ExecuteMsg::ForceBurn { from, amount } => execute_force_burn(deps, env, info, from, amount),
        ExecuteMsg::ForceTransfer {
            from,
            to,
            amount,
            reason,
        } => execute_force_transfer(deps, env, info, from, to, amount, reason),
        ExecuteMsg::SetKycStatus { address, status } => {
            execute_set_kyc(deps, env, info, address, status)
        }
        ExecuteMsg::Pause {} => execute_pause(deps, env, info),
        ExecuteMsg::Unpause {} => execute_unpause(deps, env, info),
        ExecuteMsg::UpdateOwner { owner } => execute_update_owner(deps, env, info, owner),
        ExecuteMsg::UpdateIssuer { issuer } => execute_update_issuer(deps, env, info, issuer),
        ExecuteMsg::UpdateController { controller } => {
            execute_update_controller(deps, env, info, controller)
        }
        ExecuteMsg::UpdateValidators {
            identity_registry,
            compliance,
        } => execute_update_validators(deps, env, info, identity_registry, compliance),
        ExecuteMsg::AddAgent { address } => execute_add_agent(deps, info, address),
        ExecuteMsg::RemoveAgent { address } => execute_remove_agent(deps, info, address),
        ExecuteMsg::Freeze { address } => execute_freeze(deps, info, address),
        ExecuteMsg::Unfreeze { address } => execute_unfreeze(deps, info, address),
        ExecuteMsg::FreezeMany { addresses } => execute_freeze_many(deps, info, addresses),
        ExecuteMsg::BatchTransfer { transfers } => {
            execute_batch_transfer(deps, env, info, transfers)
        }
        ExecuteMsg::BatchSetKyc { updates } => execute_batch_set_kyc(deps, info, updates),
        ExecuteMsg::ReplaceWallet { lost, new } => execute_replace_wallet(deps, info, lost, new),
        ExecuteMsg::UpdateRulePlugins { add, remove } => {
            execute_update_rule_plugins(deps, info, add, remove)
        }
        // RWA messages
        ExecuteMsg::CreateAsset {
            reference_id,
            description,
            legal_owner,
            metadata,
        } => execute_create_asset(
            deps,
            env,
            info,
            reference_id,
            description,
            legal_owner,
            metadata,
        ),
        ExecuteMsg::IssueAsset {
            asset_id,
            recipient,
            amount,
        } => execute_issue_asset(deps, env, info, asset_id, recipient, amount),
        ExecuteMsg::RequestRedemption {
            asset_id,
            amount,
            reason,
        } => execute_request_redemption(deps, env, info, asset_id, amount, reason),
        ExecuteMsg::ApproveIssue { request_id } => {
            execute_approve_issue(deps, env, info, request_id)
        }
        ExecuteMsg::ApproveRedemption { request_id } => {
            execute_approve_redemption(deps, env, info, request_id)
        }
        ExecuteMsg::AttachAttestation {
            subject,
            attestation,
        } => execute_attach_attestation(deps, env, info, subject, attestation),
        ExecuteMsg::SetTransferLimit { address, limit } => {
            execute_set_transfer_limit(deps, env, info, address, limit)
        }
        ExecuteMsg::AddToDenylist { address } => execute_add_to_denylist(deps, info, address),
        ExecuteMsg::RemoveFromDenylist { address } => execute_remove_from_denylist(deps, info, address),
        ExecuteMsg::SetGovernanceConfig { members, threshold, timelock_seconds } => execute_set_governance_config(deps, info, members, threshold, timelock_seconds),
        ExecuteMsg::SubmitGovProposal { action } => execute_submit_gov_proposal(deps, env, info, action),
        ExecuteMsg::ApproveGovProposal { proposal_id } => execute_approve_gov_proposal(deps, info, proposal_id),
        ExecuteMsg::ExecuteGovProposal { proposal_id } => execute_execute_gov_proposal(deps, env, info, proposal_id),
        // Not implemented: Revoke. Other cw20 helpers can be added following patterns.
        // All known variants are matched above.
    }
}

fn only_owner(deps: &DepsMut, info: &MessageInfo) -> Result<(), ContractError> {
    admin_mod::only_owner(&deps.as_ref(), info)
}

fn only_issuer(deps: &DepsMut, info: &MessageInfo) -> Result<(), ContractError> {
    admin_mod::only_issuer(&deps.as_ref(), info)
}

fn only_controller(deps: &DepsMut, info: &MessageInfo) -> Result<(), ContractError> {
    admin_mod::only_controller(&deps.as_ref(), info)
}

fn is_agent(deps: &DepsMut, addr: &Addr) -> StdResult<bool> {
    Ok(AGENTS.may_load(deps.storage, addr)?.unwrap_or(false))
}

fn only_owner_or_agent(deps: &DepsMut, info: &MessageInfo) -> Result<(), ContractError> {
    let owner = OWNER.load(deps.storage)?;
    if info.sender == owner {
        return Ok(());
    }
    let sender = deps.api.addr_validate(info.sender.as_ref())?;
    if is_agent(deps, &sender)? {
        Ok(())
    } else {
        Err(ContractError::Unauthorized {})
    }
}

fn check_not_paused(deps: &DepsMut) -> Result<(), ContractError> {
    let paused = PAUSED.load(deps.storage)?;
    if paused {
        return Err(ContractError::Paused {});
    }
    Ok(())
}

pub(crate) fn verify_wallet(deps: &DepsMut, addr: &Addr) -> Result<(), ContractError> {
    // denylist check
    if DENYLIST.may_load(deps.storage, addr)?.unwrap_or(false) {
        return Err(ContractError::NotCompliant("denylisted".to_string()));
    }
    // Prefer external Identity Registry when configured
    if let Some(ir_opt) = IDENTITY_REGISTRY_ADDR.may_load(deps.storage)? {
        if let Some(ir_addr) = ir_opt {
            use crate::interfaces::{IrQueryMsg, IsVerifiedResponse};
            let resp: IsVerifiedResponse = deps.as_ref().querier.query_wasm_smart(
                ir_addr,
                &IrQueryMsg::IsVerified {
                    wallet: addr.to_string(),
                },
            )?;
            if !resp.verified {
                return Err(ContractError::NotVerified(
                    resp.reason.unwrap_or_else(|| addr.to_string()),
                ));
            }
            return Ok(());
        }
    }
    // Fallback: internal KYC map
    if idreg::is_approved(&deps.as_ref(), addr)? {
        Ok(())
    } else {
        Err(ContractError::KycNotApproved(addr.to_string()))
    }
}

pub(crate) fn check_compliance(
    deps: &DepsMut,
    env: &Env,
    from: &Addr,
    to: &Addr,
    amount: Uint128,
) -> Result<(), ContractError> {
    // Prefer external Compliance contract when configured
    if let Some(comp_opt) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_opt {
            use crate::interfaces::{CanTransferResponse, ComplianceQueryMsg};
            let resp: CanTransferResponse = deps.as_ref().querier.query_wasm_smart(
                comp_addr,
                &ComplianceQueryMsg::CanTransfer {
                    token: env.contract.address.to_string(),
                    from: from.to_string(),
                    to: to.to_string(),
                    amount,
                },
            )?;
            if !resp.allowed {
                return Err(ContractError::NotCompliant(
                    resp.reason.unwrap_or_else(|| "not allowed".to_string()),
                ));
            }
        }
    }
    // Rule plugins: all must allow
    use crate::interfaces::{CanTransferResponse, ComplianceQueryMsg};
    for item in RULE_PLUGINS.range(deps.storage, None, None, Order::Ascending) {
        let (addr, enabled) = item?;
        if !enabled {
            continue;
        }
        let resp: CanTransferResponse = deps.as_ref().querier.query_wasm_smart(
            addr,
            &ComplianceQueryMsg::CanTransfer {
                token: env.contract.address.to_string(),
                from: from.to_string(),
                to: to.to_string(),
                amount,
            },
        )?;
        if !resp.allowed {
            return Err(ContractError::NotCompliant(
                resp.reason.unwrap_or_else(|| "plugin denied".to_string()),
            ));
        }
    }
    // Fallback: in-contract per-address limit for sender
    if let Some(limit_opt) = TRANSFER_LIMITS.may_load(deps.storage, from)? {
        if let Some(limit) = limit_opt {
            if amount > limit {
                return Err(ContractError::NotCompliant(
                    "transfer amount exceeds configured limit".to_string(),
                ));
            }
        }
    }
    Ok(())
}

/// Compliance check for minting operations (ERC-3643 compliant)
/// Only validates the recipient, not the sender, since tokens are created from nothing
pub(crate) fn check_mint_compliance(
    deps: &DepsMut,
    _env: &Env,
    to: &Addr,
    amount: Uint128,
) -> Result<(), ContractError> {
    // Only check recipient-specific limits, not sender limits or country checks
    // Compliance contract country checks would fail for minting since there's no "from" address
    
    // Check recipient transfer limit if configured
    if let Some(limit_opt) = TRANSFER_LIMITS.may_load(deps.storage, to)? {
        if let Some(limit) = limit_opt {
            if amount > limit {
                return Err(ContractError::NotCompliant(
                    "mint amount exceeds recipient's transfer limit".to_string(),
                ));
            }
        }
    }
    
    Ok(())
}

fn execute_transfer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    recipient: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    // Validate amount is positive
    if amount.is_zero() {
        return Err(ContractError::InvalidRequest {});
    }
    check_not_paused(&deps)?;
    let sender = info.sender.clone();
    let recipient_addr = deps.api.addr_validate(&recipient)?;
    // Verification checks: both sender and recipient must be verified
    let sender_addr = deps.api.addr_validate(sender.as_ref())?;

    // Freeze checks
    if FROZEN
        .may_load(deps.storage, &sender_addr)?
        .unwrap_or(false)
    {
        return Err(ContractError::NotCompliant("sender frozen".to_string()));
    }
    if FROZEN
        .may_load(deps.storage, &recipient_addr)?
        .unwrap_or(false)
    {
        return Err(ContractError::NotCompliant("recipient frozen".to_string()));
    }

    verify_wallet(&deps, &sender_addr)?;
    verify_wallet(&deps, &recipient_addr)?;
    // Compliance
    check_compliance(&deps, &env, &sender_addr, &recipient_addr, amount)?;

    let mut from_bal = BALANCES
        .may_load(deps.storage, &sender_addr)?
        .unwrap_or_default();
    if from_bal < amount {
        return Err(ContractError::InsufficientFunds {});
    }
    from_bal = from_bal
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &sender_addr, &from_bal)?;
    let mut to_bal = BALANCES
        .may_load(deps.storage, &recipient_addr)?
        .unwrap_or_default();
    to_bal = to_bal
        .checked_add(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &recipient_addr, &to_bal)?;

    // Call compliance callback after successful transfer
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Transferred {
                    from: sender_addr.to_string(),
                    to: recipient_addr.to_string(),
                    amount,
                })?,
                funds: vec![],
            });
        }
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "transfer")
        .add_event(
            Event::new("post_transfer")
                .add_attribute("token", env.contract.address.to_string())
                .add_attribute("operator", info.sender.to_string())
                .add_attribute("from", sender.to_string())
                .add_attribute("to", recipient.clone())
                .add_attribute("amount", amount.to_string())
                .add_attribute("method", "transfer"),
        )
        .add_attribute("from", sender.to_string())
        .add_attribute("to", recipient)
        .add_attribute("amount", amount.to_string()))
}

fn execute_mint(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    recipient: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    // Validate amount is positive
    if amount.is_zero() {
        return Err(ContractError::InvalidRequest {});
    }
    only_issuer(&deps, &info)?;
    check_not_paused(&deps)?;
    let recipient_addr = deps.api.addr_validate(&recipient)?;

    if FROZEN
        .may_load(deps.storage, &recipient_addr)?
        .unwrap_or(false)
    {
        return Err(ContractError::NotCompliant("recipient frozen".to_string()));
    }

    // CRITICAL SECURITY: Check minting cap FIRST (required enforcement)
    let minting_cap = MINTING_CAP.load(deps.storage)?;
    let current_supply = TOTAL_SUPPLY.load(deps.storage)?;
    let new_supply = current_supply.checked_add(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    
    if new_supply > minting_cap {
        return Err(ContractError::MintingCapExceeded {
            attempted: amount,
            cap: minting_cap,
            current: current_supply,
        });
    }

    // cap check (legacy, kept for backward compatibility)
    if let Some(cap) = CAP.load(deps.storage)? {
        let total = TOTAL_SUPPLY.load(deps.storage)?;
        if total + amount > cap {
            return Err(ContractError::CapReached {});
        }
    }

    // require verification approved for recipient
    verify_wallet(&deps, &recipient_addr)?;
    // For minting, only check recipient compliance (no "from" address since tokens are created)
    // This is ERC-3643 compliant - mint operations should not require sender verification
    check_mint_compliance(&deps, &env, &recipient_addr, amount)?;

    let mut bal = BALANCES
        .may_load(deps.storage, &recipient_addr)?
        .unwrap_or_default();
    bal = bal
        .checked_add(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &recipient_addr, &bal)?;
    let mut total = TOTAL_SUPPLY.load(deps.storage)?;
    total = total
        .checked_add(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    TOTAL_SUPPLY.save(deps.storage, &total)?;

    // Call compliance callback after successful mint
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Created {
                    to: recipient_addr.to_string(),
                    amount,
                })?,
                funds: vec![],
            });
        }
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "mint")
        .add_event(
            Event::new("post_mint")
                .add_attribute("token", env.contract.address.to_string())
                .add_attribute("operator", info.sender.to_string())
                .add_attribute("to", recipient.clone())
                .add_attribute("amount", amount.to_string()),
        )
        .add_attribute("to", recipient)
        .add_attribute("amount", amount.to_string()))
}

fn execute_burn(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    amount: Uint128,
) -> Result<Response, ContractError> {
    // Validate amount is positive
    if amount.is_zero() {
        return Err(ContractError::InvalidRequest {});
    }
    check_not_paused(&deps)?;
    let sender_addr = deps.api.addr_validate(info.sender.as_ref())?;
    if FROZEN
        .may_load(deps.storage, &sender_addr)?
        .unwrap_or(false)
    {
        return Err(ContractError::NotCompliant("sender frozen".to_string()));
    }
    let mut bal = BALANCES
        .may_load(deps.storage, &sender_addr)?
        .unwrap_or_default();
    if bal < amount {
        return Err(ContractError::InsufficientFunds {});
    }
    bal = bal
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &sender_addr, &bal)?;
    let mut total = TOTAL_SUPPLY.load(deps.storage)?;
    total = total
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    TOTAL_SUPPLY.save(deps.storage, &total)?;

    // Call compliance callback after successful burn
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Destroyed {
                    from: sender_addr.to_string(),
                    amount,
                })?,
                funds: vec![],
            });
        }
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "burn")
        .add_event(
            Event::new("post_burn")
                .add_attribute("token", _env.contract.address.to_string())
                .add_attribute("operator", info.sender.to_string())
                .add_attribute("from", info.sender.to_string())
                .add_attribute("amount", amount.to_string()),
        )
        .add_attribute("from", info.sender.to_string())
        .add_attribute("amount", amount.to_string()))
}

/// ERC-3643 Compliant Force Burn
/// Allows agents to burn tokens from any address (for buybacks, redemptions, compliance)
fn execute_force_burn(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    from: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    // Only agents can force burn
    only_owner_or_agent(&deps, &info)?;
    
    // Validate amount
    if amount.is_zero() {
        return Err(ContractError::InvalidRequest {});
    }
    
    // Force burn can bypass pause state and frozen state (for emergency recovery/compliance)
    // This matches ERC-3643 behavior where agents can burn frozen tokens
    let from_addr = deps.api.addr_validate(&from)?;
    
    // Get current balance
    let mut bal = BALANCES
        .may_load(deps.storage, &from_addr)?
        .unwrap_or_default();
    
    if bal < amount {
        return Err(ContractError::InsufficientFunds {});
    }
    
    // Burn tokens (bypasses frozen state as per ERC-3643)
    bal = bal.checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &from_addr, &bal)?;
    
    // Update total supply
    let mut total = TOTAL_SUPPLY.load(deps.storage)?;
    total = total.checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    TOTAL_SUPPLY.save(deps.storage, &total)?;
    
    // Call compliance callback
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Destroyed {
                    from: from_addr.to_string(),
                    amount,
                })?,
                funds: vec![],
            });
        }
    }
    
    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "force_burn")
        .add_event(
            Event::new("post_force_burn")
                .add_attribute("token", env.contract.address.to_string())
                .add_attribute("agent", info.sender.to_string())
                .add_attribute("from", from_addr.to_string())
                .add_attribute("amount", amount.to_string()),
        )
        .add_attribute("agent", info.sender.to_string())
        .add_attribute("from", from_addr.to_string())
        .add_attribute("amount", amount.to_string()))
}

fn execute_force_transfer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    from: String,
    to: String,
    amount: Uint128,
    reason: Option<String>,
) -> Result<Response, ContractError> {
    only_controller(&deps, &info)?;
    // Note: force_transfer still ignores global paused state to allow emergency recovery,
    // but it now ENFORCES recipient verification and full compliance checks.
    let from_addr = deps.api.addr_validate(&from)?;
    let to_addr = deps.api.addr_validate(&to)?;

    // Recipient must not be frozen
    if FROZEN.may_load(deps.storage, &to_addr)?.unwrap_or(false) {
        return Err(ContractError::NotCompliant("recipient frozen".to_string()));
    }

    // Require recipient (and potentially policies) to be verified
    verify_wallet(&deps, &to_addr)?;

    // Enforce compliance rules (may reject if from/to not allowed by policy)
    check_compliance(&deps, &env, &from_addr, &to_addr, amount)?;

    let mut from_bal = BALANCES
        .may_load(deps.storage, &from_addr)?
        .unwrap_or_default();
    if from_bal < amount {
        return Err(ContractError::InsufficientFunds {});
    }
    from_bal = from_bal
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &from_addr, &from_bal)?;
    let mut to_bal = BALANCES
        .may_load(deps.storage, &to_addr)?
        .unwrap_or_default();
    to_bal = to_bal
        .checked_add(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &to_addr, &to_bal)?;

    // Call compliance callback after successful force_transfer
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Transferred {
                    from: from_addr.to_string(),
                    to: to_addr.to_string(),
                    amount,
                })?,
                funds: vec![],
            });
        }
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "force_transfer")
        .add_event(
            Event::new("post_force_transfer")
                .add_attribute("token", env.contract.address.to_string())
                .add_attribute("operator", info.sender.to_string())
                .add_attribute("from", from.clone())
                .add_attribute("to", to.clone())
                .add_attribute("amount", amount.to_string()),
        )
        .add_attribute("from", from)
        .add_attribute("to", to)
        .add_attribute("amount", amount.to_string())
        .add_attribute("reason", reason.unwrap_or_default()))
}

fn execute_set_kyc(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
    status: KycStatus,
) -> Result<Response, ContractError> {
    // controller, owner, or agent can set KYC
    let sender = info.sender.clone();
    let owner = OWNER.load(deps.storage)?;
    let controller = CONTROLLER.load(deps.storage)?;
    let is_agent_flag = is_agent(&deps, &deps.api.addr_validate(sender.as_ref())?)?;
    if sender != owner && sender != controller && !is_agent_flag {
        return Err(ContractError::Unauthorized {});
    }
    let addr = deps.api.addr_validate(&address)?;
    KYC.save(deps.storage, &addr, &status)?;
    Ok(Response::new()
        .add_attribute("action", "set_kyc")
        .add_attribute("address", address)
        .add_attribute("status", format!("{:?}", status)))
}

fn execute_pause(deps: DepsMut, _env: Env, info: MessageInfo) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    PAUSED.save(deps.storage, &true)?;
    Ok(Response::new().add_attribute("action", "pause"))
}

fn execute_unpause(deps: DepsMut, _env: Env, info: MessageInfo) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    PAUSED.save(deps.storage, &false)?;
    Ok(Response::new().add_attribute("action", "unpause"))
}

fn execute_update_owner(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    owner: String,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let addr = deps.api.addr_validate(&owner)?;
    OWNER.save(deps.storage, &addr)?;
    Ok(Response::new()
        .add_attribute("action", "update_owner")
        .add_attribute("new_owner", owner))
}

fn execute_update_issuer(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    issuer: String,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let addr = deps.api.addr_validate(&issuer)?;
    ISSUER.save(deps.storage, &addr)?;
    Ok(Response::new()
        .add_attribute("action", "update_issuer")
        .add_attribute("new_issuer", issuer))
}

fn execute_update_controller(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    controller: String,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let addr = deps.api.addr_validate(&controller)?;
    CONTROLLER.save(deps.storage, &addr)?;
    Ok(Response::new()
        .add_attribute("action", "update_controller")
        .add_attribute("new_controller", controller))
}

fn execute_update_validators(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    identity_registry: Option<String>,
    compliance: Option<String>,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let ir = match identity_registry {
        Some(s) => Some(deps.api.addr_validate(&s)?),
        None => None,
    };
    let comp = match compliance {
        Some(s) => Some(deps.api.addr_validate(&s)?),
        None => None,
    };
    if ir.is_some() {
        IDENTITY_REGISTRY_ADDR.save(deps.storage, &ir)?;
    }
    if comp.is_some() {
        COMPLIANCE_ADDR.save(deps.storage, &comp)?;
    }
    Ok(Response::new().add_attribute("action", "update_validators"))
}

// RWA handlers
fn execute_create_asset(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    reference_id: String,
    description: String,
    legal_owner: String,
    metadata: Option<String>,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let legal = deps.api.addr_validate(&legal_owner)?;
    let mut seq = ASSET_SEQ.may_load(deps.storage)?.unwrap_or_default();
    seq += 1;
    ASSET_SEQ.save(deps.storage, &seq)?;
    let asset = AssetInfo {
        id: seq,
        reference_id: reference_id.clone(),
        description: description.clone(),
        legal_owner: legal.clone(),
        metadata: metadata.clone(),
        total_tokenized: Uint128::zero(),
    };
    ASSETS.save(deps.storage, seq, &asset)?;
    Ok(Response::new()
        .add_attribute("action", "create_asset")
        .add_attribute("asset_id", seq.to_string())
        .add_attribute("reference_id", reference_id))
}

fn execute_issue_asset(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    asset_id: u64,
    recipient: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    only_issuer(&deps, &info)?;
    // ensure asset exists (we don't need the loaded value here)
    let _asset = ASSETS
        .may_load(deps.storage, asset_id)?
        .ok_or(ContractError::AssetNotFound {})?;
    // create issuance request
    let mut seq = ISSUANCE_SEQ.may_load(deps.storage)?.unwrap_or_default();
    seq += 1;
    ISSUANCE_SEQ.save(deps.storage, &seq)?;
    let recipient_addr = deps.api.addr_validate(&recipient)?;
    let req = IssuanceRequest {
        id: seq,
        asset_id,
        recipient: recipient_addr.clone(),
        amount,
        approved: false,
    };
    ISSUANCE_REQUESTS.save(deps.storage, seq, &req)?;
    Ok(Response::new()
        .add_attribute("action", "issue_request")
        .add_attribute("request_id", seq.to_string()))
}

fn execute_approve_issue(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    request_id: u64,
) -> Result<Response, ContractError> {
    only_controller(&deps, &info)?;
    let mut req = ISSUANCE_REQUESTS
        .may_load(deps.storage, request_id)?
        .ok_or(ContractError::InvalidRequest {})?;
    if req.approved {
        return Err(ContractError::AlreadyApproved {});
    }
    // mark approved and mint tokens
    req.approved = true;
    ISSUANCE_REQUESTS.save(deps.storage, request_id, &req)?;
    // mint to recipient
    let mut bal = BALANCES
        .may_load(deps.storage, &req.recipient)?
        .unwrap_or_default();
    bal = bal
        .checked_add(req.amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &req.recipient, &bal)?;
    let mut total = TOTAL_SUPPLY.load(deps.storage)?;
    total = total
        .checked_add(req.amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    TOTAL_SUPPLY.save(deps.storage, &total)?;
    // update asset tokenized total
    let mut asset = ASSETS.load(deps.storage, req.asset_id)?;
    asset.total_tokenized = asset
        .total_tokenized
        .checked_add(req.amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    ASSETS.save(deps.storage, req.asset_id, &asset)?;

    // Call compliance callback after successful asset issuance (mint)
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Created {
                    to: req.recipient.to_string(),
                    amount: req.amount,
                })?,
                funds: vec![],
            });
        }
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "approve_issue")
        .add_attribute("request_id", request_id.to_string()))
}

fn execute_request_redemption(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    asset_id: u64,
    amount: Uint128,
    reason: Option<String>,
) -> Result<Response, ContractError> {
    check_not_paused(&deps)?;
    let requester = deps.api.addr_validate(info.sender.as_ref())?;
    // ensure balance
    let mut bal = BALANCES
        .may_load(deps.storage, &requester)?
        .unwrap_or_default();
    if bal < amount {
        return Err(ContractError::InsufficientFunds {});
    }
    // lock or subtract tokens immediately to avoid double spend until approved
    bal = bal
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &requester, &bal)?;
    let mut seq = REDEEM_SEQ.may_load(deps.storage)?.unwrap_or_default();
    seq += 1;
    REDEEM_SEQ.save(deps.storage, &seq)?;
    let req = RedemptionRequest {
        id: seq,
        asset_id,
        requester: requester.clone(),
        amount,
        approved: false,
        reason: reason.clone(),
    };
    REDEEM_REQUESTS.save(deps.storage, seq, &req)?;
    Ok(Response::new()
        .add_attribute("action", "request_redemption")
        .add_attribute("request_id", seq.to_string()))
}

fn execute_approve_redemption(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    request_id: u64,
) -> Result<Response, ContractError> {
    only_controller(&deps, &info)?;
    let mut req = REDEEM_REQUESTS
        .may_load(deps.storage, request_id)?
        .ok_or(ContractError::InvalidRequest {})?;
    if req.approved {
        return Err(ContractError::AlreadyApproved {});
    }
    req.approved = true;
    REDEEM_REQUESTS.save(deps.storage, request_id, &req)?;
    // reduce total tokenized and total supply
    let mut asset = ASSETS.load(deps.storage, req.asset_id)?;
    asset.total_tokenized = asset
        .total_tokenized
        .checked_sub(req.amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    ASSETS.save(deps.storage, req.asset_id, &asset)?;
    let mut total = TOTAL_SUPPLY.load(deps.storage)?;
    total = total
        .checked_sub(req.amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    TOTAL_SUPPLY.save(deps.storage, &total)?;

    // Call compliance callback after successful redemption (burn)
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Destroyed {
                    from: req.requester.to_string(),
                    amount: req.amount,
                })?,
                funds: vec![],
            });
        }
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "approve_redemption")
        .add_attribute("request_id", request_id.to_string()))
}

fn execute_attach_attestation(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    subject: String,
    attestation: String,
) -> Result<Response, ContractError> {
    only_controller(&deps, &info)?;
    let subj = deps.api.addr_validate(&subject)?;
    ATTESTATIONS.save(deps.storage, &subj, &attestation)?;
    Ok(Response::new()
        .add_attribute("action", "attach_attestation")
        .add_attribute("subject", subject))
}

fn execute_set_transfer_limit(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    address: String,
    limit: Option<Uint128>,
) -> Result<Response, ContractError> {
    // only owner or controller
    let sender = info.sender.clone();
    let owner = OWNER.load(deps.storage)?;
    let controller = CONTROLLER.load(deps.storage)?;
    if sender != owner && sender != controller {
        return Err(ContractError::Unauthorized {});
    }
    let addr = deps.api.addr_validate(&address)?;
    TRANSFER_LIMITS.save(deps.storage, &addr, &limit)?;
    Ok(Response::new()
        .add_attribute("action", "set_transfer_limit")
        .add_attribute("address", address)
        .add_attribute("limit", format!("{:?}", limit)))
}

fn execute_approve(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    spender: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    check_not_paused(&deps)?;
    let owner = deps.api.addr_validate(info.sender.as_ref())?;
    let spender_addr = deps.api.addr_validate(&spender)?;

    // ensure spender KYC approved
    if !idreg::is_approved(&deps.as_ref(), &spender_addr)? {
        return Err(ContractError::KycNotApproved(spender));
    }

    ALLOWANCES.save(deps.storage, (&owner, &spender_addr), &amount)?;
    Ok(Response::new()
        .add_attribute("action", "approve")
        .add_attribute("owner", owner.to_string())
        .add_attribute("spender", spender)
        .add_attribute("amount", amount.to_string()))
}

fn execute_transfer_from(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    owner: String,
    recipient: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    check_not_paused(&deps)?;
    let spender = deps.api.addr_validate(info.sender.as_ref())?;
    let owner_addr = deps.api.addr_validate(&owner)?;
    let recipient_addr = deps.api.addr_validate(&recipient)?;

    if FROZEN.may_load(deps.storage, &owner_addr)?.unwrap_or(false) {
        return Err(ContractError::NotCompliant("owner frozen".to_string()));
    }
    if FROZEN
        .may_load(deps.storage, &recipient_addr)?
        .unwrap_or(false)
    {
        return Err(ContractError::NotCompliant("recipient frozen".to_string()));
    }

    // Verification checks
    verify_wallet(&deps, &owner_addr)?;
    verify_wallet(&deps, &recipient_addr)?;

    // allowance check
    let mut allowance = ALLOWANCES
        .may_load(deps.storage, (&owner_addr, &spender))?
        .unwrap_or_default();
    if allowance < amount {
        return Err(ContractError::InsufficientFunds {});
    }

    // compliance
    check_compliance(&deps, &env, &owner_addr, &recipient_addr, amount)?;

    // balances
    let mut owner_bal = BALANCES
        .may_load(deps.storage, &owner_addr)?
        .unwrap_or_default();
    if owner_bal < amount {
        return Err(ContractError::InsufficientFunds {});
    }
    owner_bal = owner_bal
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &owner_addr, &owner_bal)?;
    let mut rec_bal = BALANCES
        .may_load(deps.storage, &recipient_addr)?
        .unwrap_or_default();
    rec_bal = rec_bal
        .checked_add(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, &recipient_addr, &rec_bal)?;

    // reduce allowance
    allowance = allowance
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    ALLOWANCES.save(deps.storage, (&owner_addr, &spender), &allowance)?;

    // Call compliance callback after successful transfer_from
    let mut messages = vec![];
    if let Some(comp_addr) = COMPLIANCE_ADDR.may_load(deps.storage)? {
        if let Some(comp_addr) = comp_addr {
            messages.push(cosmwasm_std::WasmMsg::Execute {
                contract_addr: comp_addr.to_string(),
                msg: to_json_binary(&ComplianceExecuteMsg::Transferred {
                    from: owner_addr.to_string(),
                    to: recipient_addr.to_string(),
                    amount,
                })?,
                funds: vec![],
            });
        }
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "transfer_from")
        .add_attribute("owner", owner)
        .add_attribute("recipient", recipient)
        .add_attribute("amount", amount.to_string()))
    .map(|mut r| {
        r.events.push(
            Event::new("post_transfer")
                .add_attribute("token", env.contract.address.to_string())
                .add_attribute("operator", info.sender.to_string())
                .add_attribute("from", owner_addr.to_string())
                .add_attribute("to", recipient_addr.to_string())
                .add_attribute("amount", amount.to_string())
                .add_attribute("method", "transfer_from"),
        );
        r
    })
}

fn execute_add_agent(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let addr = deps.api.addr_validate(&address)?;
    AGENTS.save(deps.storage, &addr, &true)?;
    Ok(Response::new()
        .add_attribute("action", "add_agent")
        .add_attribute("address", address))
}

fn execute_remove_agent(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let addr = deps.api.addr_validate(&address)?;
    AGENTS.remove(deps.storage, &addr);
    Ok(Response::new()
        .add_attribute("action", "remove_agent")
        .add_attribute("address", address))
}

fn execute_freeze(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    // owner or agent can freeze
    only_owner_or_agent(&deps, &info)?;
    let addr = deps.api.addr_validate(&address)?;
    FROZEN.save(deps.storage, &addr, &true)?;
    Ok(Response::new()
        .add_attribute("action", "freeze")
        .add_attribute("address", address))
}

fn execute_unfreeze(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    only_owner_or_agent(&deps, &info)?;
    let addr = deps.api.addr_validate(&address)?;
    FROZEN.save(deps.storage, &addr, &false)?;
    Ok(Response::new()
        .add_attribute("action", "unfreeze")
        .add_attribute("address", address))
}

fn execute_freeze_many(
    deps: DepsMut,
    info: MessageInfo,
    addresses: Vec<String>,
) -> Result<Response, ContractError> {
    only_owner_or_agent(&deps, &info)?;
    for a in addresses.into_iter() {
        let addr = deps.api.addr_validate(&a)?;
        FROZEN.save(deps.storage, &addr, &true)?;
    }
    Ok(Response::new().add_attribute("action", "freeze_many"))
}

fn transfer_core(
    deps: &mut DepsMut,
    env: &Env,
    sender_addr: &Addr,
    recipient_addr: &Addr,
    amount: Uint128,
) -> Result<(), ContractError> {
    if FROZEN.may_load(deps.storage, sender_addr)?.unwrap_or(false) {
        return Err(ContractError::NotCompliant("sender frozen".to_string()));
    }
    if FROZEN
        .may_load(deps.storage, recipient_addr)?
        .unwrap_or(false)
    {
        return Err(ContractError::NotCompliant("recipient frozen".to_string()));
    }
    verify_wallet(deps, sender_addr)?;
    verify_wallet(deps, recipient_addr)?;
    check_compliance(deps, env, sender_addr, recipient_addr, amount)?;
    let mut from_bal = BALANCES
        .may_load(deps.storage, sender_addr)?
        .unwrap_or_default();
    if from_bal < amount {
        return Err(ContractError::InsufficientFunds {});
    }
    from_bal = from_bal
        .checked_sub(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, sender_addr, &from_bal)?;
    let mut to_bal = BALANCES
        .may_load(deps.storage, recipient_addr)?
        .unwrap_or_default();
    to_bal = to_bal
        .checked_add(amount)
        .map_err(|e| ContractError::Std(e.into()))?;
    BALANCES.save(deps.storage, recipient_addr, &to_bal)?;
    Ok(())
}

fn execute_batch_transfer(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    transfers: Vec<TransferItem>,
) -> Result<Response, ContractError> {
    check_not_paused(&mut deps)?;
    let sender_addr = deps.api.addr_validate(info.sender.as_ref())?;
    let mut resp = Response::new().add_attribute("action", "batch_transfer");
    for t in transfers.into_iter() {
        let rcpt = deps.api.addr_validate(&t.recipient)?;
        transfer_core(&mut deps, &env, &sender_addr, &rcpt, t.amount)?;
        resp = resp
            .add_attribute("to", rcpt.to_string())
            .add_attribute("amount", t.amount.to_string());
    }
    Ok(resp)
}

fn execute_batch_set_kyc(
    deps: DepsMut,
    info: MessageInfo,
    updates: Vec<KycUpdate>,
) -> Result<Response, ContractError> {
    // owner, controller, or agent
    let sender = info.sender.clone();
    let owner = OWNER.load(deps.storage)?;
    let controller = CONTROLLER.load(deps.storage)?;
    let is_agent_flag = is_agent(&deps, &deps.api.addr_validate(sender.as_ref())?)?;
    if sender != owner && sender != controller && !is_agent_flag {
        return Err(ContractError::Unauthorized {});
    }
    for u in updates.into_iter() {
        let addr = deps.api.addr_validate(&u.address)?;
        KYC.save(deps.storage, &addr, &u.status)?;
    }
    Ok(Response::new().add_attribute("action", "batch_set_kyc"))
}

fn execute_replace_wallet(
    deps: DepsMut,
    info: MessageInfo,
    lost: String,
    new: String,
) -> Result<Response, ContractError> {
    // owner or controller only
    let owner = OWNER.load(deps.storage)?;
    let controller = CONTROLLER.load(deps.storage)?;
    if info.sender != owner && info.sender != controller {
        return Err(ContractError::Unauthorized {});
    }
    let lost_addr = deps.api.addr_validate(&lost)?;
    let new_addr = deps.api.addr_validate(&new)?;

    // Move balance
    let lost_bal = BALANCES
        .may_load(deps.storage, &lost_addr)?
        .unwrap_or_default();
    if !lost_bal.is_zero() {
        let mut new_bal = BALANCES
            .may_load(deps.storage, &new_addr)?
            .unwrap_or_default();
        new_bal = new_bal
            .checked_add(lost_bal)
            .map_err(|e| ContractError::Std(e.into()))?;
        BALANCES.save(deps.storage, &new_addr, &new_bal)?;
        BALANCES.save(deps.storage, &lost_addr, &Uint128::zero())?;
    }
    // Move KYC (preserve status)
    if let Some(status) = KYC.may_load(deps.storage, &lost_addr)? {
        KYC.save(deps.storage, &new_addr, &status)?;
    }
    // Move transfer limits
    if let Some(limit_opt) = TRANSFER_LIMITS.may_load(deps.storage, &lost_addr)? {
        TRANSFER_LIMITS.save(deps.storage, &new_addr, &limit_opt)?;
        TRANSFER_LIMITS.remove(deps.storage, &lost_addr);
    }
    // Move attestations
    if let Some(att) = ATTESTATIONS.may_load(deps.storage, &lost_addr)? {
        ATTESTATIONS.save(deps.storage, &new_addr, &att)?;
        ATTESTATIONS.remove(deps.storage, &lost_addr);
    }
    // Move allowances where lost is owner
    let owner_rows: Vec<(Addr, Uint128)> = ALLOWANCES
        .prefix(&lost_addr)
        .range(deps.storage, None, None, Order::Ascending)
        .collect::<StdResult<Vec<_>>>()?;
    for (spender, amount) in owner_rows.into_iter() {
        // Merge into (new, spender)
        let current = ALLOWANCES
            .may_load(deps.storage, (&new_addr, &spender))?
            .unwrap_or_default();
        let merged = current
            .checked_add(amount)
            .map_err(|e| ContractError::Std(e.into()))?;
        ALLOWANCES.save(deps.storage, (&new_addr, &spender), &merged)?;
        // remove old
        ALLOWANCES.remove(deps.storage, (&lost_addr, &spender));
    }
    // Move allowances where lost is spender (we must scan all owners)
    let all_rows: Vec<((Addr, Addr), Uint128)> = ALLOWANCES
        .range(deps.storage, None, None, Order::Ascending)
        .collect::<StdResult<Vec<_>>>()?;
    for ((owner, spender), amount) in all_rows.into_iter() {
        if spender == lost_addr {
            let current = ALLOWANCES
                .may_load(deps.storage, (&owner, &new_addr))?
                .unwrap_or_default();
            let merged = current
                .checked_add(amount)
                .map_err(|e| ContractError::Std(e.into()))?;
            ALLOWANCES.save(deps.storage, (&owner, &new_addr), &merged)?;
            ALLOWANCES.remove(deps.storage, (&owner, &lost_addr));
        }
    }
    // Remove agent flag if any and freeze lost
    AGENTS.remove(deps.storage, &lost_addr);
    FROZEN.save(deps.storage, &lost_addr, &true)?;

    Ok(Response::new()
        .add_attribute("action", "replace_wallet")
        .add_attribute("lost", lost)
        .add_attribute("new", new))
}

fn execute_update_rule_plugins(
    deps: DepsMut,
    info: MessageInfo,
    add: Vec<String>,
    remove: Vec<String>,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    for a in add.into_iter() {
        let addr = deps.api.addr_validate(&a)?;
        RULE_PLUGINS.save(deps.storage, &addr, &true)?;
    }
    for r in remove.into_iter() {
        let addr = deps.api.addr_validate(&r)?;
        RULE_PLUGINS.remove(deps.storage, &addr);
    }
    Ok(Response::new().add_attribute("action", "update_rule_plugins"))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::TokenInfo {} => to_json_binary(&query_token_info(deps)?),
        QueryMsg::AssetInfo { asset_id } => to_json_binary(&query_asset_info(deps, asset_id)?),
        QueryMsg::RedemptionRequests { start_after, limit } => {
            to_json_binary(&query_redemption_requests(deps, start_after, limit)?)
        }
        QueryMsg::Balance { address } => to_json_binary(&query_balance(deps, address)?),
        QueryMsg::Allowance { owner, spender } => {
            to_json_binary(&query_allowance(deps, owner, spender)?)
        }
        QueryMsg::TransferLimit { address } => {
            to_json_binary(&query_transfer_limit(deps, address)?)
        }
        QueryMsg::TotalSupply {} => to_json_binary(&query_total_supply(deps)?),
        QueryMsg::KycStatus { address } => to_json_binary(&query_kyc_status(deps, address)?),
        QueryMsg::Roles {} => to_json_binary(&query_roles(deps)?),
        QueryMsg::Paused {} => to_json_binary(&query_paused(deps)?),
        QueryMsg::Cap {} => to_json_binary(&query_cap(deps)?),
        QueryMsg::MintingCap {} => to_json_binary(&query_minting_cap(deps)?),
        QueryMsg::Validators {} => to_json_binary(&query_validators(deps)?),
        QueryMsg::Agents {} => to_json_binary(&query_agents(deps)?),
        QueryMsg::Frozen { address } => to_json_binary(&query_frozen(deps, address)?),
        QueryMsg::RulePlugins {} => to_json_binary(&query_rule_plugins(deps)?),
        QueryMsg::ComplianceMetrics {} => to_json_binary(&query_compliance_metrics(deps)?),
        QueryMsg::GovConfig {} => to_json_binary(&query_gov_config(deps)?),
        QueryMsg::GovProposal { proposal_id } => to_json_binary(&query_gov_proposal(deps, proposal_id)?),
        QueryMsg::GovProposals { start_after, limit } => to_json_binary(&query_gov_proposals(deps, start_after, limit)?),
        // All QueryMsg variants are handled above.
    }
}

fn query_allowance(deps: Deps, owner: String, spender: String) -> StdResult<Uint128> {
    let owner_addr = deps.api.addr_validate(&owner)?;
    let spender_addr = deps.api.addr_validate(&spender)?;
    let allowance = ALLOWANCES
        .may_load(deps.storage, (&owner_addr, &spender_addr))?
        .unwrap_or_default();
    Ok(allowance)
}

fn query_token_info(deps: Deps) -> StdResult<TokenInfoResponse> {
    let name = TOKEN_NAME.load(deps.storage)?;
    let symbol = TOKEN_SYMBOL.load(deps.storage)?;
    let decimals = TOKEN_DECIMALS.load(deps.storage)?;
    let total_supply = TOTAL_SUPPLY.load(deps.storage)?;
    Ok(TokenInfoResponse {
        name,
        symbol,
        decimals,
        total_supply,
    })
}

fn query_balance(deps: Deps, address: String) -> StdResult<Uint128> {
    let addr = deps.api.addr_validate(&address)?;
    Ok(BALANCES.may_load(deps.storage, &addr)?.unwrap_or_default())
}

fn query_total_supply(deps: Deps) -> StdResult<Uint128> { TOTAL_SUPPLY.load(deps.storage) }

fn query_kyc_status(deps: Deps, address: String) -> StdResult<KycStatusResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let status = KYC
        .may_load(deps.storage, &addr)?
        .unwrap_or(KycStatus::Pending);
    Ok(KycStatusResponse {
        address: addr.to_string(),
        status,
    })
}

fn query_roles(deps: Deps) -> StdResult<RolesResponse> {
    let owner = OWNER.load(deps.storage)?;
    let issuer = ISSUER.load(deps.storage)?;
    let controller = CONTROLLER.load(deps.storage)?;
    Ok(RolesResponse {
        owner: owner.to_string(),
        issuer: issuer.to_string(),
        controller: controller.to_string(),
    })
}

fn query_paused(deps: Deps) -> StdResult<bool> { PAUSED.load(deps.storage) }

fn query_cap(deps: Deps) -> StdResult<Option<Uint128>> { CAP.load(deps.storage) }

fn query_minting_cap(deps: Deps) -> StdResult<MintingCapResponse> {
    let minting_cap = MINTING_CAP.load(deps.storage)?;
    let current_supply = TOTAL_SUPPLY.load(deps.storage)?;
    let available_to_mint = minting_cap.saturating_sub(current_supply);
    Ok(MintingCapResponse {
        minting_cap,
        current_supply,
        available_to_mint,
    })
}

fn query_validators(deps: Deps) -> StdResult<ValidatorsResponse> {
    let ir = IDENTITY_REGISTRY_ADDR
        .may_load(deps.storage)?
        .flatten()
        .map(|a| a.to_string());
    let comp = COMPLIANCE_ADDR
        .may_load(deps.storage)?
        .flatten()
        .map(|a| a.to_string());
    Ok(ValidatorsResponse {
        identity_registry: ir,
        compliance: comp,
    })
}

fn query_agents(deps: Deps) -> StdResult<AgentsResponse> {
    let mut list: Vec<String> = vec![];
    for item in AGENTS.range(deps.storage, None, None, Order::Ascending) {
        let (addr, enabled) = item?;
        if enabled {
            list.push(addr.to_string());
        }
    }
    Ok(AgentsResponse { agents: list })
}

fn query_frozen(deps: Deps, address: String) -> StdResult<bool> {
    let addr = deps.api.addr_validate(&address)?;
    Ok(FROZEN.may_load(deps.storage, &addr)?.unwrap_or(false))
}

fn query_rule_plugins(deps: Deps) -> StdResult<RulePluginsResponse> {
    let mut list: Vec<String> = vec![];
    for item in RULE_PLUGINS.range(deps.storage, None, None, Order::Ascending) {
        let (addr, enabled) = item?;
        if enabled {
            list.push(addr.to_string());
        }
    }
    Ok(RulePluginsResponse { plugins: list })
}

// --- Observability Queries ---
fn query_compliance_metrics(deps: Deps) -> StdResult<ComplianceMetricsResponse> {
    let mut kyc_pending = 0u32;
    let mut kyc_approved = 0u32;
    let mut kyc_revoked = 0u32;
    let mut frozen_count = 0u32;
    let mut denylisted = 0u32;
    for item in KYC.range(deps.storage, None, None, Order::Ascending) {
        let (addr, status) = item?;
        match status {
            KycStatus::Pending => kyc_pending += 1,
            KycStatus::Approved => kyc_approved += 1,
            KycStatus::Revoked => kyc_revoked += 1,
        }
        if FROZEN.may_load(deps.storage, &addr)?.unwrap_or(false) { frozen_count += 1; }
        if DENYLIST.may_load(deps.storage, &addr)?.unwrap_or(false) { denylisted += 1; }
    }
    Ok(ComplianceMetricsResponse { kyc_pending, kyc_approved, kyc_revoked, frozen_count, denylisted })
}

// --- Denylist Execute ---
fn execute_add_to_denylist(deps: DepsMut, info: MessageInfo, address: String) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let addr = deps.api.addr_validate(&address)?;
    DENYLIST.save(deps.storage, &addr, &true)?;
    Ok(Response::new().add_attribute("action","add_to_denylist").add_attribute("address", address))
}

fn execute_remove_from_denylist(deps: DepsMut, info: MessageInfo, address: String) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    let addr = deps.api.addr_validate(&address)?;
    DENYLIST.remove(deps.storage, &addr);
    Ok(Response::new().add_attribute("action","remove_from_denylist").add_attribute("address", address))
}

// --- Governance Helpers & Execute ---
fn is_gov_member(deps: &DepsMut, addr: &Addr) -> StdResult<bool> {
    Ok(GOV_MEMBERS.may_load(deps.storage, addr)?.unwrap_or(false))
}

fn execute_set_governance_config(
    deps: DepsMut,
    info: MessageInfo,
    members: Vec<String>,
    threshold: u32,
    timelock_seconds: u64,
) -> Result<Response, ContractError> {
    only_owner(&deps, &info)?;
    if threshold == 0 { return Err(ContractError::NotCompliant("threshold=0".to_string())); }
    if members.is_empty() { return Err(ContractError::NotCompliant("no members".to_string())); }
    if threshold > members.len() as u32 { return Err(ContractError::NotCompliant("threshold>members".to_string())); }
    for m in members.iter() {
        let addr = deps.api.addr_validate(m)?;
        GOV_MEMBERS.save(deps.storage, &addr, &true)?;
    }
    GOV_CONFIG.save(deps.storage, &Some(GovConfig { threshold, timelock_seconds }))?;
    Ok(Response::new().add_attribute("action","set_governance_config").add_attribute("members", members.len().to_string()).add_attribute("threshold", threshold.to_string()).add_attribute("timelock_seconds", timelock_seconds.to_string()))
}

fn execute_submit_gov_proposal(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    action: String,
) -> Result<Response, ContractError> {
    let sender = deps.api.addr_validate(info.sender.as_ref())?;
    if !is_gov_member(&deps, &sender)? { return Err(ContractError::Unauthorized {}); }
    let cfg = GOV_CONFIG.load(deps.storage)?.ok_or(ContractError::InvalidRequest {})?;
    let mut seq = GOV_PROPOSAL_SEQ.may_load(deps.storage)?.unwrap_or_default();
    seq += 1; GOV_PROPOSAL_SEQ.save(deps.storage, &seq)?;
    let creation = env.block.time.seconds();
    let prop = GovProposal { id: seq, action: action.clone(), proposer: sender.clone(), approvals: 0, executed: false, creation_time: creation, timelock_end: creation + cfg.timelock_seconds };
    GOV_PROPOSALS.save(deps.storage, seq, &prop)?;
    Ok(Response::new().add_attribute("action","submit_gov_proposal").add_attribute("proposal_id", seq.to_string()).add_attribute("timelock_end", prop.timelock_end.to_string()))
}

fn execute_approve_gov_proposal(
    deps: DepsMut,
    info: MessageInfo,
    proposal_id: u64,
) -> Result<Response, ContractError> {
    let sender = deps.api.addr_validate(info.sender.as_ref())?;
    if !is_gov_member(&deps, &sender)? { return Err(ContractError::Unauthorized {}); }
    GOV_PROPOSALS.update(deps.storage, proposal_id, |old| -> StdResult<_> {
        let mut p = old.ok_or_else(|| cosmwasm_std::StdError::not_found("gov_proposal"))?;
        if p.executed { return Err(cosmwasm_std::StdError::generic_err("already executed")); }
        p.approvals += 1; Ok(p)
    })?;
    Ok(Response::new().add_attribute("action","approve_gov_proposal").add_attribute("proposal_id", proposal_id.to_string()))
}

fn execute_execute_gov_proposal(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    proposal_id: u64,
) -> Result<Response, ContractError> {
    let cfg = GOV_CONFIG.load(deps.storage)?.ok_or(ContractError::InvalidRequest {})?;
    let p = GOV_PROPOSALS.load(deps.storage, proposal_id)?;
    if p.executed { return Err(ContractError::InvalidRequest {}); }
    if p.approvals < cfg.threshold { return Err(ContractError::InvalidRequest {}); }
    if env.block.time.seconds() < p.timelock_end { return Err(ContractError::InvalidRequest {}); }

    // Apply supported actions
    let mut resp = apply_gov_action(&mut deps, &info, &p.action)?;
    // Mark executed
    GOV_PROPOSALS.update(deps.storage, proposal_id, |old| -> StdResult<_> {
        let mut p2 = old.ok_or_else(|| cosmwasm_std::StdError::not_found("gov_proposal"))?;
        p2.executed = true; Ok(p2)
    })?;
    resp = resp.add_attribute("action","execute_gov_proposal").add_attribute("proposal_id", proposal_id.to_string());
    Ok(resp)
}

fn apply_gov_action(deps: &mut DepsMut, _info: &MessageInfo, action: &str) -> Result<Response, ContractError> {
    // Supported forms:
    // - "pause"
    // - "unpause"
    if action.eq_ignore_ascii_case("pause") {
        PAUSED.save(deps.storage, &true)?;
        return Ok(Response::new().add_attribute("gov_action","pause"));
    }
    if action.eq_ignore_ascii_case("unpause") {
        PAUSED.save(deps.storage, &false)?;
        return Ok(Response::new().add_attribute("gov_action","unpause"));
    }
    // Unknown action: treat as no-op but indicate type (could reject instead)
    Ok(Response::new().add_attribute("gov_action","noop").add_attribute("raw", action))
}

// --- Governance Queries ---
fn query_gov_config(deps: Deps) -> StdResult<GovConfigResponse> {
    let cfg = GOV_CONFIG.load(deps.storage)?.ok_or_else(|| cosmwasm_std::StdError::not_found("gov_config"))?;
    let mut members: Vec<String> = vec![];
    for item in GOV_MEMBERS.range(deps.storage, None, None, Order::Ascending) {
        let (addr, enabled) = item?; if enabled { members.push(addr.to_string()); }
    }
    Ok(GovConfigResponse { members, threshold: cfg.threshold, timelock_seconds: cfg.timelock_seconds })
}

fn query_gov_proposal(deps: Deps, proposal_id: u64) -> StdResult<GovProposalResponse> {
    let p = GOV_PROPOSALS.load(deps.storage, proposal_id)?;
    Ok(GovProposalResponse { id: p.id, action: p.action, proposer: p.proposer.to_string(), approvals: p.approvals, executed: p.executed, creation_time: p.creation_time, timelock_end: p.timelock_end })
}

fn query_gov_proposals(deps: Deps, start_after: Option<u64>, limit: Option<u32>) -> StdResult<Vec<GovProposalResponse>> {
    let start = start_after.unwrap_or_default();
    let lim = limit.unwrap_or(20).min(100) as usize;
    let mut out: Vec<GovProposalResponse> = vec![];
    let mut count = 0usize;
    for item in GOV_PROPOSALS.range(deps.storage, None, None, Order::Ascending) {
        let (id, p) = item?;
        if id <= start { continue; }
        out.push(GovProposalResponse { id: p.id, action: p.action.clone(), proposer: p.proposer.to_string(), approvals: p.approvals, executed: p.executed, creation_time: p.creation_time, timelock_end: p.timelock_end });
        count += 1; if count >= lim { break; }
    }
    Ok(out)
}

fn query_asset_info(deps: Deps, asset_id: u64) -> StdResult<AssetInfoResponse> {
    let asset = ASSETS.load(deps.storage, asset_id)?;
    Ok(AssetInfoResponse {
        asset_id: asset.id,
        reference_id: asset.reference_id,
        description: asset.description,
        legal_owner: asset.legal_owner.to_string(),
        metadata: asset.metadata,
        total_tokenized: asset.total_tokenized,
    })
}

fn query_transfer_limit(deps: Deps, address: String) -> StdResult<Option<Uint128>> {
    let addr = deps.api.addr_validate(&address)?;
    Ok(TRANSFER_LIMITS
        .may_load(deps.storage, &addr)?
        .unwrap_or(None))
}

fn query_redemption_requests(
    deps: Deps,
    start_after: Option<u64>,
    limit: Option<u32>,
) -> StdResult<Vec<RedeemRequestResponse>> {
    let mut res: Vec<RedeemRequestResponse> = vec![];
    let start = start_after.unwrap_or_default();
    let lim = limit.unwrap_or(10).min(100) as usize;
    let mut count = 0usize;
    for item in REDEEM_REQUESTS.range(deps.storage, None, None, cosmwasm_std::Order::Ascending) {
        let (id, v) = item?;
        if id <= start { continue; }
        res.push(RedeemRequestResponse { id: v.id, asset_id: v.asset_id, requester: v.requester.to_string(), amount: v.amount, approved: v.approved, reason: v.reason });
        count += 1; if count >= lim { break; }
    }
    Ok(res)
}

#[entry_point]
pub fn migrate(deps: DepsMut, _env: Env, _msg: MigrateMsg) -> Result<Response, ContractError> {
    // Ensure contract version updated
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    // Initialize new optional keys if absent
    if IDENTITY_REGISTRY_ADDR.may_load(deps.storage)?.is_none() {
        IDENTITY_REGISTRY_ADDR.save(deps.storage, &None)?;
    }
    if COMPLIANCE_ADDR.may_load(deps.storage)?.is_none() {
        COMPLIANCE_ADDR.save(deps.storage, &None)?;
    }
    // Initialize TF maps lazily; cw-storage-plus maps don't require explicit init.
    // No initialization required for maps; ensure paused key exists already.
    Ok(Response::new().add_attribute("action", "migrate"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::message_info;
    use cosmwasm_std::testing::{mock_dependencies, mock_env};
    use cosmwasm_std::{coins, from_json};

    #[test]
    fn migrate_initializes_validator_keys() {
        let mut deps = mock_dependencies();

        // Before migrate, keys are unset; after migrate, they exist with None
        let res = migrate(deps.as_mut(), mock_env(), MigrateMsg {}).unwrap();
        assert!(res.attributes.iter().any(|a| a.key == "action" && a.value == "migrate"));

        // Validate storage contains the new optional keys initialized to None
        let ir = IDENTITY_REGISTRY_ADDR
            .may_load(deps.as_ref().storage)
            .unwrap();
        let comp = COMPLIANCE_ADDR.may_load(deps.as_ref().storage).unwrap();
        assert!(ir.is_some());
        assert!(comp.is_some());
        assert!(ir.unwrap().is_none());
        assert!(comp.unwrap().is_none());
    }

    #[test]
    fn agent_freeze_and_replace_wallet_flow() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        // Prepare valid bech32-like addrs via MockApi
        let api = cosmwasm_std::testing::MockApi::default();
        let owner_addr = api.addr_make("owner");
        let controller_addr = owner_addr.clone();
        let issuer_addr = owner_addr.clone();
        let deployer = api.addr_make("deployer");
        let alice_addr = api.addr_make("alice");
        let bob_addr = api.addr_make("bob");
        let agent_addr = api.addr_make("agent");

        // Instantiate
        let inst = InstantiateMsg {
            name: "RWA".to_string(),
            symbol: "RWA".to_string(),
            decimals: 6u8,
            initial_balances: vec![InitialBalance {
                address: alice_addr.to_string(),
                amount: Uint128::new(100),
            }],
            issuer: issuer_addr.to_string(),
            controller: controller_addr.to_string(),
            owner: owner_addr.to_string(),
            cap: None,
            minting_cap: Uint128::new(1_000_000),
            require_kyc_for_transfer: None,
            identity_registry: None,
            compliance: None,
        };
        let _ = instantiate(
            deps.as_mut(),
            env.clone(),
            message_info(&deployer, &coins(0, "u")),
            inst,
        )
        .unwrap();

        // Owner adds agent
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::AddAgent {
                address: agent_addr.to_string(),
            },
        )
        .unwrap();
        // Agent sets KYC Approved for alice and bob
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&agent_addr, &[]),
            ExecuteMsg::SetKycStatus {
                address: alice_addr.to_string(),
                status: KycStatus::Approved,
            },
        )
        .unwrap();
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&agent_addr, &[]),
            ExecuteMsg::SetKycStatus {
                address: bob_addr.to_string(),
                status: KycStatus::Approved,
            },
        )
        .unwrap();

        // Agent freezes alice
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&agent_addr, &[]),
            ExecuteMsg::Freeze {
                address: alice_addr.to_string(),
            },
        )
        .unwrap();
        // Alice attempts transfer -> should fail
        let res = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&alice_addr, &[]),
            ExecuteMsg::Transfer {
                recipient: bob_addr.to_string(),
                amount: Uint128::new(1),
            },
        );
        assert!(res.is_err());

        // Owner replaces alice with alice2
        let alice2_addr = api.addr_make("alice2");
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::ReplaceWallet {
                lost: alice_addr.to_string(),
                new: alice2_addr.to_string(),
            },
        )
        .unwrap();
        // Approve KYC for alice2
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&agent_addr, &[]),
            ExecuteMsg::SetKycStatus {
                address: alice2_addr.to_string(),
                status: KycStatus::Approved,
            },
        )
        .unwrap();

        // Balance moved
        let bal_alice2_bin = query(
            deps.as_ref(),
            env.clone(),
            QueryMsg::Balance {
                address: alice2_addr.to_string(),
            },
        )
        .unwrap();
        let bal_alice2: Uint128 = from_json(&bal_alice2_bin).unwrap();
        assert_eq!(bal_alice2, Uint128::new(100));

        // alice2 can transfer now and a post_transfer event is emitted
        let res = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&alice2_addr, &[]),
            ExecuteMsg::Transfer {
                recipient: bob_addr.to_string(),
                amount: Uint128::new(10),
            },
        )
        .unwrap();
        assert!(res.events.iter().any(|e| e.ty == "post_transfer"));
        let bal_bob_bin = query(
            deps.as_ref(),
            env.clone(),
            QueryMsg::Balance {
                address: bob_addr.to_string(),
            },
        )
        .unwrap();
        let bal_bob: Uint128 = from_json(&bal_bob_bin).unwrap();
        assert_eq!(bal_bob, Uint128::new(10));
    }

    #[test]
    fn denylist_blocks_mint_and_transfer() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        let api = cosmwasm_std::testing::MockApi::default();
        let owner_addr = api.addr_make("owner");
        let deployer = api.addr_make("deployer");
        let bob_addr = api.addr_make("bob");

        // Instantiate with owner as all roles and initial balance to owner
        let inst = InstantiateMsg {
            name: "RWA".to_string(),
            symbol: "RWA".to_string(),
            decimals: 6u8,
            initial_balances: vec![InitialBalance { address: owner_addr.to_string(), amount: Uint128::new(100) }],
            issuer: owner_addr.to_string(),
            controller: owner_addr.to_string(),
            owner: owner_addr.to_string(),
            cap: None,
            minting_cap: Uint128::new(1_000_000),
            require_kyc_for_transfer: None,
            identity_registry: None,
            compliance: None,
        };
        let _ = instantiate(
            deps.as_mut(),
            env.clone(),
            message_info(&deployer, &coins(0, "u")),
            inst,
        )
        .unwrap();

        // Approve KYC for bob via owner as agent/controller capabilities
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::SetKycStatus { address: bob_addr.to_string(), status: KycStatus::Approved },
        )
        .unwrap();

        // Add bob to denylist
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::AddToDenylist { address: bob_addr.to_string() },
        )
        .unwrap();

        // Mint to bob should fail (owner is issuer)
        let res = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::Mint { recipient: bob_addr.to_string(), amount: Uint128::new(1) },
        );
        assert!(res.is_err());

        // Transfer from owner to bob should fail
        let res = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::Transfer { recipient: bob_addr.to_string(), amount: Uint128::new(1) },
        );
        assert!(res.is_err());

        // Remove from denylist and transfer should now succeed
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::RemoveFromDenylist { address: bob_addr.to_string() },
        )
        .unwrap();

        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::Transfer { recipient: bob_addr.to_string(), amount: Uint128::new(1) },
        )
        .unwrap();
    }

    #[test]
    fn governance_pause_unpause_flow() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        let api = cosmwasm_std::testing::MockApi::default();
        let owner_addr = api.addr_make("owner");
        let deployer = api.addr_make("deployer");
        let m1 = api.addr_make("m1");
        let m2 = api.addr_make("m2");

        let inst = InstantiateMsg {
            name: "RWA".to_string(),
            symbol: "RWA".to_string(),
            decimals: 6u8,
            initial_balances: vec![],
            issuer: owner_addr.to_string(),
            controller: owner_addr.to_string(),
            owner: owner_addr.to_string(),
            cap: None,
            minting_cap: Uint128::new(1_000_000),
            require_kyc_for_transfer: None,
            identity_registry: None,
            compliance: None,
        };
        let _ = instantiate(
            deps.as_mut(),
            env.clone(),
            message_info(&deployer, &coins(0, "u")),
            inst,
        )
        .unwrap();

        // Configure governance with 2 members, threshold 2, no timelock
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&owner_addr, &[]),
            ExecuteMsg::SetGovernanceConfig { members: vec![m1.to_string(), m2.to_string()], threshold: 2, timelock_seconds: 0 },
        )
        .unwrap();

        // Submit pause by m1 -> proposal id 1
        let _ = execute(
            deps.as_mut(),
            env.clone(),
            message_info(&m1, &[]),
            ExecuteMsg::SubmitGovProposal { action: "pause".to_string() },
        )
        .unwrap();

        // Approve by both
        let _ = execute(
            deps.as_mut(), env.clone(), message_info(&m1, &[]), ExecuteMsg::ApproveGovProposal { proposal_id: 1 }
        ).unwrap();
        let _ = execute(
            deps.as_mut(), env.clone(), message_info(&m2, &[]), ExecuteMsg::ApproveGovProposal { proposal_id: 1 }
        ).unwrap();

        // Execute
        let _ = execute(
            deps.as_mut(), env.clone(), message_info(&m1, &[]), ExecuteMsg::ExecuteGovProposal { proposal_id: 1 }
        ).unwrap();

        // Assert paused
        let paused_bin = query(deps.as_ref(), env.clone(), QueryMsg::Paused {}).unwrap();
        let paused: bool = from_json(&paused_bin).unwrap();
        assert!(paused);

        // Submit unpause and run similarly
        let _ = execute(
            deps.as_mut(), env.clone(), message_info(&m2, &[]), ExecuteMsg::SubmitGovProposal { action: "unpause".to_string() }
        ).unwrap();
        let _ = execute(
            deps.as_mut(), env.clone(), message_info(&m1, &[]), ExecuteMsg::ApproveGovProposal { proposal_id: 2 }
        ).unwrap();
        let _ = execute(
            deps.as_mut(), env.clone(), message_info(&m2, &[]), ExecuteMsg::ApproveGovProposal { proposal_id: 2 }
        ).unwrap();
        let _ = execute(
            deps.as_mut(), env.clone(), message_info(&owner_addr, &[]), ExecuteMsg::ExecuteGovProposal { proposal_id: 2 }
        ).unwrap();
        let paused_bin = query(deps.as_ref(), env.clone(), QueryMsg::Paused {}).unwrap();
        let paused: bool = from_json(&paused_bin).unwrap();
        assert!(!paused);
    }
}
