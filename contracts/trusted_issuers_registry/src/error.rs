use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Issuer already trusted: {issuer}")]
    IssuerAlreadyTrusted { issuer: String },

    #[error("Issuer not found: {issuer}")]
    IssuerNotFound { issuer: String },
    
    #[error("Too many issuers: maximum is {max}")]
    TooManyIssuers { max: usize },
    
    #[error("Too many topics per issuer: maximum is {max}")]
    TooManyTopicsPerIssuer { max: usize },
    
    #[error("Cannot set empty topics array")]
    EmptyTopics {},
}
