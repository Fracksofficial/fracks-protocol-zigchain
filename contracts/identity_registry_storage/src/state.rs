use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

pub const OWNER: Item<Addr> = Item::new("owner");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Identity {
    pub identity: Addr,
    pub country: u16,
}

pub const IDENTITIES: Map<&Addr, Identity> = Map::new("identities");
pub const LINKED_REGISTRIES: Item<Vec<Addr>> = Item::new("linked_registries");
