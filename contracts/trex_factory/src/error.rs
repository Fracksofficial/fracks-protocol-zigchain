use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Token with asset_id {asset_id} not found")]
    TokenNotFound { asset_id: u64 },

    #[error("Asset already tokenized with contract: {contract}")]
    AssetAlreadyTokenized { contract: String },

    #[error("Invalid token code_id")]
    InvalidCodeId {},
}
