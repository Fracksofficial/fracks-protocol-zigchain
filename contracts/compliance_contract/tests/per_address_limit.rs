use cosmwasm_std::{Addr, Uint128};
use cw_multi_test::{App, AppBuilder, Contract, ContractWrapper, Executor};

use compliance_contract_cw::msg::{CanTransferResponse, ExecuteMsg, InstantiateMsg, QueryMsg};

fn compliance_contract() -> Box<dyn Contract<cosmwasm_std::Empty>> {
    let contract = ContractWrapper::new(
        compliance_contract_cw::contract::execute,
        compliance_contract_cw::contract::instantiate,
        compliance_contract_cw::contract::query,
    );
    Box::new(contract)
}

#[test]
fn per_address_limit_blocks_large_amount_and_allows_small() {
    // Arrange
    let mut app: App = AppBuilder::new().build(|_, _, _| {});
    let code_id = app.store_code(compliance_contract());

    // Use api.addr_make to generate valid bech32-like addresses for this test app
    let owner: Addr = app.api().addr_make("owner");
    let alice: Addr = app.api().addr_make("alice");
    let bob: Addr = app.api().addr_make("bob");

    let instantiate = InstantiateMsg {
        owner: owner.to_string(),
        identity_registry: None,
    };
    let comp_addr = app
        .instantiate_contract(code_id, owner.clone(), &instantiate, &[], "comp", None)
        .unwrap();

    // Set per-address limit for Alice to 50
    let msg = ExecuteMsg::SetPerAddressLimit {
        address: alice.to_string(),
        limit: Some(Uint128::new(50)),
    };
    app.execute_contract(owner.clone(), comp_addr.clone(), &msg, &[])
        .unwrap();

    // Act/Assert: can_transfer 100 => false
    let resp: CanTransferResponse = app
        .wrap()
        .query_wasm_smart(
            comp_addr.clone(),
            &QueryMsg::CanTransfer {
                token: "token".into(),
                from: alice.to_string(),
                to: bob.to_string(),
                amount: Uint128::new(100),
            },
        )
        .unwrap();
    assert!(!resp.allowed);
    assert_eq!(
        resp.reason.as_deref(),
        Some("amount exceeds per-address limit")
    );

    // Act/Assert: can_transfer 25 => true
    let resp_ok: CanTransferResponse = app
        .wrap()
        .query_wasm_smart(
            comp_addr,
            &QueryMsg::CanTransfer {
                token: "token".into(),
                from: alice.to_string(),
                to: bob.to_string(),
                amount: Uint128::new(25),
            },
        )
        .unwrap();
    assert!(resp_ok.allowed);
    assert_eq!(resp_ok.reason, None);
}
