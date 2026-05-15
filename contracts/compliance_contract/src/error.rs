use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Country {country} is restricted")]
    CountryRestricted { country: u16 },

    #[error("Transfer amount {amount} exceeds limit {limit}")]
    TransferLimitExceeded { amount: String, limit: String },

    #[error("{msg}")]
    CustomError { msg: String },
}
