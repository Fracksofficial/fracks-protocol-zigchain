use cosmwasm_std::{StdError, Uint128};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},
    #[error("Paused")]
    Paused {},
    #[error("KYC not approved for address: {0}")]
    KycNotApproved(String),
    #[error("Cap reached")]
    CapReached {},
    #[error("Minting cap exceeded: attempted {attempted}, cap {cap}, current supply {current}")]
    MintingCapExceeded {
        attempted: Uint128,
        cap: Uint128,
        current: Uint128,
    },
    #[error("Insufficient funds")]
    InsufficientFunds {},
    #[error("Asset not found")]
    AssetNotFound {},
    #[error("Invalid request")]
    InvalidRequest {},
    #[error("Already approved")]
    AlreadyApproved {},
    #[error("Not compliant: {0}")]
    NotCompliant(String),
    #[error("Not verified for address: {0}")]
    NotVerified(String),
    // Add any other custom errors you like here.
    // Look at https://docs.rs/thiserror/1.0.21/thiserror/ for details.
}
