use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

pub const OWNER: Item<Addr> = Item::new("owner");
pub const TRUSTED_ISSUERS_ADDR: Item<Option<Addr>> = Item::new("trusted_issuers_addr");
pub const CLAIM_TOPICS_ADDR: Item<Option<Addr>> = Item::new("claim_topics_addr");
pub const IDENTITY_STORAGE_ADDR: Item<Option<Addr>> = Item::new("identity_storage_addr");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IdentityRef {
    pub identity_addr: Addr,
    pub country: Option<String>,
}

pub const REGISTRY: Map<&Addr, IdentityRef> = Map::new("registry");
