use cosmwasm_std::Uint128;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Interface that all compliance modules must implement
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ModuleQueryMsg {
    /// Check if a transfer is allowed by this module
    CanTransfer {
        from: String,
        to: String,
        amount: Uint128,
    },
    /// Get module information
    ModuleInfo {},
}

/// Response from CanTransfer query
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ModuleCanTransferResponse {
    pub allowed: bool,
    pub reason: Option<String>,
}

/// Module information response
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ModuleInfoResponse {
    pub name: String,
    pub description: Option<String>,
    pub version: String,
}

/// Execute messages that modules can handle
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ModuleExecuteMsg {
    /// Called after a successful transfer
    Transferred {
        from: String,
        to: String,
        amount: Uint128,
    },
    /// Called after tokens are created (minted)
    Created {
        to: String,
        amount: Uint128,
    },
    /// Called after tokens are destroyed (burned)
    Destroyed {
        from: String,
        amount: Uint128,
    },
}