//! Claim Topics Registry Library
//! 
//! This library provides the public API for the Claim Topics Registry contract.
//! All business logic is implemented in contract.rs.

pub mod contract;
pub mod error;
pub mod msg;
pub mod state;

// Re-export for external usage
pub use crate::error::ContractError;
pub use crate::msg::{ExecuteMsg, InstantiateMsg, MigrateMsg, QueryMsg};
