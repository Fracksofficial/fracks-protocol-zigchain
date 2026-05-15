use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

pub const OWNER: Item<Addr> = Item::new("owner");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IssuerTopics {
    pub topics: Vec<u32>,
}

pub const ISSUERS: Map<&Addr, IssuerTopics> = Map::new("issuers");

// ERC-3643 v4.0 Optimization: Reverse index from topic to issuers
// Enables O(1) lookup instead of O(n) iteration in isVerified()
pub const TOPICS_TO_ISSUERS: Map<u32, Vec<Addr>> = Map::new("topics_to_issuers");
