use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Identity already stored for address")]
    IdentityAlreadyStored {},

    #[error("Identity not stored for address")]
    IdentityNotStored {},

    #[error("Cannot bind more than 300 identity registries")]
    TooManyRegistries {},

    #[error("Identity registry not bound")]
    RegistryNotBound {},
}
