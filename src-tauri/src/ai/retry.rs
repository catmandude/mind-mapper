use super::provider::{AiError, AiMessage, AiProvider, AiResponse};
use tokio::time::sleep;
use std::time::Duration;

const MAX_RETRIES: u32 = 5;

pub async fn complete_with_retry(
    provider: &dyn AiProvider,
    messages: Vec<AiMessage>,
) -> Result<AiResponse, String> {
    let mut last_error = String::new();

    for attempt in 0..=MAX_RETRIES {
        let msgs = messages.clone();
        match provider.complete(msgs).await {
            Ok(response) => return Ok(response),
            Err(AiError::ClientError(msg)) => {
                return Err(msg);
            }
            Err(AiError::RateLimit { retry_after_secs }) => {
                if attempt == MAX_RETRIES {
                    return Err(format!("Rate limited after {} retries", MAX_RETRIES));
                }
                let delay = retry_after_secs.unwrap_or_else(|| 2u64.pow(attempt + 1));
                eprintln!(
                    "[{}] Rate limited (attempt {}/{}), retrying in {}s",
                    provider.name(),
                    attempt + 1,
                    MAX_RETRIES,
                    delay
                );
                sleep(Duration::from_secs(delay)).await;
                last_error = "Rate limited".to_string();
            }
            Err(AiError::ServerError(msg)) => {
                if attempt == MAX_RETRIES {
                    return Err(format!("Server error after {} retries: {}", MAX_RETRIES, msg));
                }
                let delay = 2u64.pow(attempt + 1);
                eprintln!(
                    "[{}] Server error (attempt {}/{}), retrying in {}s: {}",
                    provider.name(),
                    attempt + 1,
                    MAX_RETRIES,
                    delay,
                    msg
                );
                sleep(Duration::from_secs(delay)).await;
                last_error = msg;
            }
        }
    }

    Err(last_error)
}
