use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Topic already exists: {topic}")]
    TopicAlreadyExists { topic: u32 },

    #[error("Topic not found: {topic}")]
    TopicNotFound { topic: u32 },
    
    #[error("Too many claim topics: maximum is {max}")]
    TooManyTopics { max: usize },
}
