use cosmwasm_std::Uint128;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// Interfaces for external validator contracts
// Identity Registry (IR)
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum IrQueryMsg {
    IsVerified { wallet: String },
    Identity { wallet: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IsVerifiedResponse {
    pub verified: bool,
    pub reason: Option<String>,
}

// Compliance contract
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ComplianceQueryMsg {
    CanTransfer {
        token: String,
        from: String,
        to: String,
        amount: Uint128,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct CanTransferResponse {
    pub allowed: bool,
    pub reason: Option<String>,
}

// Compliance contract execute messages (for callbacks)
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ComplianceExecuteMsg {
    Transferred {
        from: String,
        to: String,
        amount: Uint128,
    },
    Created {
        to: String,
        amount: Uint128,
    },
    Destroyed {
        from: String,
        amount: Uint128,
    },
}
