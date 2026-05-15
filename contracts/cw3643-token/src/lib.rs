#![allow(clippy::collapsible_match, clippy::unnecessary_mut_passed)]
//! CW-3643 Token Library
//! 
//! This library provides the public API for the CW-3643 compliant security token contract.
//! All business logic is implemented in contract.rs and supporting modules.

pub mod admin;
pub mod compliance;
pub mod contract;
pub mod error;
pub mod identity_registry;
pub mod interfaces;
pub mod msg;
pub mod state;

// Re-export for external usage
pub use crate::error::ContractError;
pub use crate::msg::{ExecuteMsg, InstantiateMsg, MigrateMsg, QueryMsg};
