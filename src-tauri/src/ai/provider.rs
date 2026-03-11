use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResponse {
    pub content: String,
}

#[derive(Debug)]
pub enum AiError {
    RateLimit { retry_after_secs: Option<u64> },
    ServerError(String),
    ClientError(String),
}

impl fmt::Display for AiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AiError::RateLimit { retry_after_secs } => {
                write!(f, "Rate limited")?;
                if let Some(secs) = retry_after_secs {
                    write!(f, " (retry after {}s)", secs)?;
                }
                Ok(())
            }
            AiError::ServerError(msg) => write!(f, "Server error: {}", msg),
            AiError::ClientError(msg) => write!(f, "Client error: {}", msg),
        }
    }
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn complete(&self, messages: Vec<AiMessage>) -> Result<AiResponse, AiError>;
    fn name(&self) -> &str;
}
