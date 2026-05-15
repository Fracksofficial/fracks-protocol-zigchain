use cosmwasm_std::Uint128;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub owner: String,
    pub identity_registry: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    // Module management
    AddModule {
        module: String,
        name: String,
    },
    RemoveModule {
        module: String,
    },

    // Legacy compliance rules (now modules can override)
    SetPerAddressLimit {
        address: String,
        limit: Option<Uint128>,
    },
    SetAllowedCountries {
        countries: Option<Vec<String>>,
    },

    // TREX callback functions
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

    // Configuration
    SetIdentityRegistry {
        addr: Option<String>,
    },
    UpdateOwner {
        owner: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    CanTransfer {
        token: String,
        from: String,
        to: String,
        amount: Uint128,
    },
    Config {},
    Modules {},
    ModuleInfo {
        module: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct CanTransferResponse {
    pub allowed: bool,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ConfigResponse {
    pub owner: String,
    pub identity_registry: Option<String>,
    pub allowed_countries: Option<Vec<String>>,
    pub module_count: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ModulesResponse {
    pub modules: Vec<ModuleInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ModuleInfo {
    pub address: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ModuleInfoResponse {
    pub info: Option<ModuleInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MigrateMsg {}
