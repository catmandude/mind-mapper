use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

use super::provider::{AiConfig, AiMessage, AiProvider, AiResponse};

pub struct OpenAiProvider {
    client: Client,
    api_key: String,
    model: String,
    base_url: String,
}

impl OpenAiProvider {
    pub fn new(config: &AiConfig) -> Self {
        Self {
            client: Client::new(),
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
    async fn complete(&self, messages: Vec<AiMessage>) -> Result<AiResponse, String> {
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
            .map_err(|e| format!("OpenAI request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("OpenAI API error {}: {}", status, text));
        }

        let data: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("OpenAI response parse error: {}", e))?;

        let content = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(AiResponse { content })
    }

    fn name(&self) -> &str {
        "openai"
    }
}
