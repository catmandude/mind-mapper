use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use std::time::Duration;

use super::provider::{AiConfig, AiError, AiMessage, AiProvider, AiResponse};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

pub struct ClaudeProvider {
    client: Client,
    api_key: String,
    model: String,
    base_url: String,
}

impl ClaudeProvider {
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
                .unwrap_or_else(|| "https://api.anthropic.com".to_string()),
        }
    }
}

#[async_trait]
impl AiProvider for ClaudeProvider {
    async fn complete(&self, messages: Vec<AiMessage>) -> Result<AiResponse, AiError> {
        let url = format!("{}/v1/messages", self.base_url.trim_end_matches('/'));

        // Extract system message if present, rest are user/assistant messages
        let mut system_text = String::new();
        let mut api_messages: Vec<serde_json::Value> = Vec::new();

        for msg in &messages {
            if msg.role == "system" {
                system_text = msg.content.clone();
            } else {
                api_messages.push(json!({
                    "role": msg.role,
                    "content": msg.content,
                }));
            }
        }

        let mut body = json!({
            "model": self.model,
            "max_tokens": 1024,
            "temperature": 0.3,
            "messages": api_messages,
        });

        if !system_text.is_empty() {
            body["system"] = json!(system_text);
        }

        let resp = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AiError::ServerError(format!("Claude request failed: {}", e)))?;

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
                500..=599 => AiError::ServerError(format!("Claude API error {}: {}", status, text)),
                _ => AiError::ClientError(format!("Claude API error {}: {}", status, text)),
            });
        }

        let data: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AiError::ClientError(format!("Claude response parse error: {}", e)))?;

        let content = data
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();

        Ok(AiResponse { content })
    }

    fn name(&self) -> &str {
        "claude"
    }
}
