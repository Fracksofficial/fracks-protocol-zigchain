use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

pub const OWNER: Item<Addr> = Item::new("owner");
pub const CLAIM_SEQ: Item<u64> = Item::new("claim_seq");

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ClaimRecord {
    pub id: u64,
    pub topic: u32,
    pub issuer: Addr,
    pub data: Option<String>,
    pub issued_at: u64,
    pub expires_at: Option<u64>,
    pub revoked: bool,
}

// Keyed by (topic, claim_id)
pub const CLAIMS: Map<(u32, u64), ClaimRecord> = Map::new("claims");
