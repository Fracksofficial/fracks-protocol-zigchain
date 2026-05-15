use cw_storage_plus::Item;

pub const OWNER: Item<String> = Item::new("owner");
pub const REQUIRED_TOPICS: Item<Vec<u32>> = Item::new("required_topics");
