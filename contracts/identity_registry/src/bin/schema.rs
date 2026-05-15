use cosmwasm_schema::write_api;

use identity_registry_cw::msg::{ExecuteMsg, InstantiateMsg, MigrateMsg};

fn main() {
    write_api! {
        instantiate: InstantiateMsg,
        execute: ExecuteMsg,
        migrate: MigrateMsg,
    }
}
