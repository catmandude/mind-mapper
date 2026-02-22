use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

use super::provider::{AiConfig, AiMessage, AiProvider, AiResponse};

pub struct ClaudeProvider {
    client: Client,
    api_key: String,
    model: String,
    base_url: String,
}

impl ClaudeProvider {
    pub fn new(config: &AiConfig) -> Self {
        Self {
            client: Client::new(),
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
    async fn complete(&self, messages: Vec<AiMessage>) -> Result<AiResponse, String> {
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
            .map_err(|e| format!("Claude request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Claude API error {}: {}", status, text));
        }

        let data: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Claude response parse error: {}", e))?;

        let content = data["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(AiResponse { content })
    }

    fn name(&self) -> &str {
        "claude"
    }
}
