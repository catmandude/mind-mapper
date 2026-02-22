use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

use super::provider::{AiConfig, AiMessage, AiProvider, AiResponse};

pub struct OllamaProvider {
    client: Client,
    model: String,
    base_url: String,
}

impl OllamaProvider {
    pub fn new(config: &AiConfig) -> Self {
        Self {
            client: Client::new(),
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
    async fn complete(&self, messages: Vec<AiMessage>) -> Result<AiResponse, String> {
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
            .map_err(|e| format!("Ollama request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Ollama API error {}: {}", status, text));
        }

        let data: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Ollama response parse error: {}", e))?;

        let content = data["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(AiResponse { content })
    }

    fn name(&self) -> &str {
        "ollama"
    }
}
