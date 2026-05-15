use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Addr;

#[cw_serde]
pub struct InstantiateMsg {
    pub owner: String,
}

#[cw_serde]
pub enum ExecuteMsg {
    AddIdentity {
        wallet: String,
        identity: String,
        country: u16,
    },
    ModifyIdentity {
        wallet: String,
        identity: String,
    },
    ModifyCountry {
        wallet: String,
        country: u16,
    },
    RemoveIdentity {
        wallet: String,
    },
    BindIdentityRegistry {
        registry: String,
    },
    UnbindIdentityRegistry {
        registry: String,
    },
    TransferOwnership {
        new_owner: String,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(IdentityResponse)]
    StoredIdentity { wallet: String },
    
    #[returns(CountryResponse)]
    StoredCountry { wallet: String },
    
    #[returns(LinkedRegistriesResponse)]
    LinkedRegistries {},
    
    #[returns(OwnerResponse)]
    Owner {},
}

#[cw_serde]
pub struct IdentityResponse {
    pub identity: Addr,
    pub country: u16,
}

#[cw_serde]
pub struct CountryResponse {
    pub country: u16,
}

#[cw_serde]
pub struct LinkedRegistriesResponse {
    pub registries: Vec<Addr>,
}

#[cw_serde]
pub struct OwnerResponse {
    pub owner: Addr,
}
