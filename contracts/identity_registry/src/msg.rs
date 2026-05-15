use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub owner: String,
    pub trusted_issuers: Option<String>,
    pub claim_topics: Option<String>,
    pub identity_storage: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    RegisterIdentity {
        wallet: String,
        identity_addr: String,
        country: Option<String>,
    },
    UnregisterIdentity {
        wallet: String,
    },
    UpdateIdentity {
        wallet: String,
        identity_addr: String,
    },
    UpdateCountry {
        wallet: String,
        country: Option<String>,
    },
    UpdateOwner {
        owner: String,
    },
    UpdateTrustedIssuers {
        addr: Option<String>,
    },
    UpdateClaimTopics {
        addr: Option<String>,
    },
    BindIdentityStorage {
        addr: Option<String>,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    IsVerified { wallet: String },
    Identity { wallet: String },
    Contains { wallet: String },
    TrustedIssuersRegistry {},
    ClaimTopicsRegistry {},
    Config {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IsVerifiedResponse {
    pub verified: bool,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IdentityResponse {
    pub wallet: String,
    pub identity_addr: Option<String>,
    pub country: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ConfigResponse {
    pub owner: String,
    pub trusted_issuers: Option<String>,
    pub claim_topics: Option<String>,
    pub identity_storage: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ContainsResponse {
    pub contains: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct RegistryAddressResponse {
    pub address: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MigrateMsg {}
