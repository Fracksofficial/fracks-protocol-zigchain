use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

pub const OWNER: Item<Addr> = Item::new("owner");
pub const IDENTITY_REGISTRY_ADDR: Item<Option<Addr>> = Item::new("identity_registry_addr");

// Per-address transfer limit override (None means unlimited)
pub const PER_ADDR_LIMIT: Map<&Addr, Option<Uint128>> = Map::new("per_addr_limit");

// Allowed countries. If empty or None, all countries are allowed.
pub const ALLOWED_COUNTRIES: Item<Option<Vec<String>>> = Item::new("allowed_countries");

// Compliance modules: module_address -> module_info
pub const MODULES: Map<&Addr, ModuleInfo> = Map::new("modules");

// Module names: name -> address (for lookup by name)
pub const MODULE_NAMES: Map<&str, Addr> = Map::new("module_names");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ModuleInfo {
    pub name: String,
}
