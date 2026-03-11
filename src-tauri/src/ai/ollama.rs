use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use std::time::Duration;

use super::provider::{AiConfig, AiError, AiMessage, AiProvider, AiResponse};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(120);

pub struct OllamaProvider {
    client: Client,
    model: String,
    base_url: String,
}

impl OllamaProvider {
    pub fn new(config: &AiConfig) -> Self {
        Self {
            client: Client::builder()
                .timeout(REQUEST_TIMEOUT)
                .build()
                .unwrap_or_default(),
            model: config.model.clone(),
            base_url: config
                .base_url
                .clone()
                .unwrap_or_else(|| "http://localhost:11434".to_string()),
        }
    }
}

#[async_trait]
impl AiProvider for OllamaProvider {
    async fn complete(&self, messages: Vec<AiMessage>) -> Result<AiResponse, AiError> {
        let url = format!("{}/api/chat", self.base_url.trim_end_matches('/'));

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
            "stream": false,
            "format": "json",
        });

        let resp = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AiError::ServerError(format!("Ollama request failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let text = resp.text().await.unwrap_or_default();
            return Err(match status {
                429 => AiError::RateLimit { retry_after_secs: None },
                500..=599 => AiError::ServerError(format!("Ollama API error {}: {}", status, text)),
                _ => AiError::ClientError(format!("Ollama API error {}: {}", status, text)),
            });
        }

        let data: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AiError::ClientError(format!("Ollama response parse error: {}", e)))?;

        let content = data
            .get("message")
            .and_then(|msg| msg.get("content"))
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();

        Ok(AiResponse { content })
    }

    fn name(&self) -> &str {
        "ollama"
    }
}
