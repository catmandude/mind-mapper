use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use std::time::Duration;

use super::provider::{AiConfig, AiError, AiMessage, AiProvider, AiResponse};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

pub struct OpenAiProvider {
    client: Client,
    api_key: String,
    model: String,
    base_url: String,
}

impl OpenAiProvider {
    pub fn new(config: &AiConfig) -> Self {
        Self {
            client: Client::builder()
                .timeout(REQUEST_TIMEOUT)
                .build()
                .unwrap_or_default(),
            api_key: config.api_key.clone(),
            model: config.model.clone(),
            base_url: config
                .base_url
                .clone()
                .unwrap_or_else(|| "https://api.openai.com".to_string()),
        }
    }
}

#[async_trait]
impl AiProvider for OpenAiProvider {
    async fn complete(&self, messages: Vec<AiMessage>) -> Result<AiResponse, AiError> {
        let url = format!("{}/v1/chat/completions", self.base_url.trim_end_matches('/'));

        let msgs: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                json!({
                    "role": m.role,
                    "content": m.content,
                })
            })
            .collect();

        let body = json!({
            "model": self.model,
            "messages": msgs,
            "temperature": 0.3,
            "response_format": { "type": "json_object" },
        });

        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AiError::ServerError(format!("OpenAI request failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let retry_after = resp
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok());
            let text = resp.text().await.unwrap_or_default();
            return Err(match status {
                429 => AiError::RateLimit { retry_after_secs: retry_after },
                500..=599 => AiError::ServerError(format!("OpenAI API error {}: {}", status, text)),
                _ => AiError::ClientError(format!("OpenAI API error {}: {}", status, text)),
            });
        }

        let data: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AiError::ClientError(format!("OpenAI response parse error: {}", e)))?;

        let content = data
            .get("choices")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|choice| choice.get("message"))
            .and_then(|msg| msg.get("content"))
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();

        Ok(AiResponse { content })
    }

    fn name(&self) -> &str {
        "openai"
    }
}
