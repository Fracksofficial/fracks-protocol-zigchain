use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub owner: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    AddIssuer { issuer: String, topics: Vec<u32> },
    UpdateIssuerTopics { issuer: String, topics: Vec<u32> },
    RemoveIssuer { issuer: String },
    UpdateOwner { owner: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    IssuerTopics { issuer: String },
    IsIssuerForTopic { issuer: String, topic: u32 },
    AllIssuers {},
    // ERC-3643 v4.0: Gas-optimized query for isVerified()
    TrustedIssuersForTopic { topic: u32 },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IssuerTopicsResponse {
    pub issuer: String,
    pub topics: Vec<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IsIssuerForTopicResponse {
    pub issuer: String,
    pub topic: u32,
    pub allowed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct AllIssuersResponse {
    pub issuers: Vec<IssuerTopicsResponse>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct TrustedIssuersForTopicResponse {
    pub issuers: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MigrateMsg {}
