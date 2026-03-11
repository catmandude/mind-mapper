use serde::{Deserialize, Serialize};
use std::sync::Arc;

use super::claude::ClaudeProvider;
use super::ollama::OllamaProvider;
use super::openai::OpenAiProvider;
use super::provider::{AiConfig, AiMessage, AiProvider};
use super::retry::complete_with_retry;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorizationRequest {
    pub title: String,
    pub content: String,
    pub needs_type: bool,
    pub needs_language: bool,
    pub needs_tags: bool,
    pub needs_folder: bool,
    pub needs_description: bool,
    pub needs_title: bool,
    pub existing_tags: Vec<String>,
    pub existing_folders: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CategorizationResult {
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
    pub folder: Option<String>,
    pub description: Option<String>,
    pub title: Option<String>,
}

const VALID_TYPES: &[&str] = &["shell", "snippet", "config", "note"];
const VALID_LANGUAGES: &[&str] = &[
    "bash",
    "javascript",
    "typescript",
    "python",
    "rust",
    "go",
    "json",
    "yaml",
    "toml",
    "sql",
    "html",
    "css",
    "markdown",
    "dockerfile",
    "terraform",
    "other",
];

pub fn create_provider(config: &AiConfig) -> Arc<dyn AiProvider> {
    match config.provider.as_str() {
        "claude" => Arc::new(ClaudeProvider::new(config)),
        "ollama" => Arc::new(OllamaProvider::new(config)),
        _ => Arc::new(OpenAiProvider::new(config)),
    }
}

pub async fn categorize(
    provider: &dyn AiProvider,
    request: &CategorizationRequest,
) -> Result<CategorizationResult, String> {
    let system_prompt = build_system_prompt(request);

    let content_preview: String = request.content.chars().take(4000).collect();
    let user_content = format!(
        "Title: {}\n\nContent:\n{}",
        request.title, content_preview
    );

    let messages = vec![
        AiMessage {
            role: "system".to_string(),
            content: system_prompt,
        },
        AiMessage {
            role: "user".to_string(),
            content: user_content,
        },
    ];

    let response = complete_with_retry(provider, messages).await?;
    parse_response(&response.content, request)
}

fn build_system_prompt(request: &CategorizationRequest) -> String {
    let mut prompt = String::from(
        "You are a categorization assistant for a developer knowledge base. \
         Analyze the given item and return a JSON object with ONLY the requested fields.\n\n",
    );

    let mut fields = Vec::new();

    if request.needs_type {
        fields.push(format!(
            "\"type\": one of [{}]",
            VALID_TYPES
                .iter()
                .map(|t| format!("\"{}\"", t))
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    if request.needs_language {
        fields.push(format!(
            "\"language\": one of [{}] or empty string if not code",
            VALID_LANGUAGES
                .iter()
                .map(|l| format!("\"{}\"", l))
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    if request.needs_tags {
        let mut tag_instruction =
            "\"tags\": array of 1-5 short lowercase tags describing the item".to_string();
        if !request.existing_tags.is_empty() {
            tag_instruction.push_str(&format!(
                ". Prefer reusing from existing tags: [{}]",
                request
                    .existing_tags
                    .iter()
                    .take(50)
                    .map(|t| format!("\"{}\"", t))
                    .collect::<Vec<_>>()
                    .join(", ")
            ));
        }
        fields.push(tag_instruction);
    }

    if request.needs_folder {
        let folder_instruction = if !request.existing_folders.is_empty() {
            format!(
                "\"folder\": MUST be one of these folders: [{}]. Do NOT invent new folders",
                request
                    .existing_folders
                    .iter()
                    .take(50)
                    .map(|f| format!("\"{}\"", f))
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        } else {
            "\"folder\": a hierarchical path like \"/category\" or \"/category/subcategory\""
                .to_string()
        };
        fields.push(folder_instruction);
    }

    if request.needs_description {
        fields.push(
            "\"description\": a concise one-line summary (max 100 chars)".to_string(),
        );
    }

    if request.needs_title {
        fields.push(
            "\"title\": a concise descriptive title (2-8 words)".to_string(),
        );
    }

    prompt.push_str("Return a JSON object with these fields:\n");
    for field in &fields {
        prompt.push_str(&format!("- {}\n", field));
    }

    prompt.push_str("\nReturn ONLY valid JSON, no markdown fences, no explanation.");
    prompt
}

fn parse_response(
    raw: &str,
    request: &CategorizationRequest,
) -> Result<CategorizationResult, String> {
    // Strip markdown code fences if present
    let json_str = raw.trim();
    let json_str = if json_str.starts_with("```") {
        let start = json_str.find('{').unwrap_or(0);
        let end = json_str.rfind('}').map(|i| i + 1).unwrap_or(json_str.len());
        &json_str[start..end]
    } else {
        json_str
    };

    let parsed: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("Failed to parse AI response: {}", e))?;

    let mut result = CategorizationResult::default();

    if request.needs_type {
        if let Some(t) = parsed.get("type").and_then(|v| v.as_str()) {
            if VALID_TYPES.contains(&t) {
                result.item_type = Some(t.to_string());
            }
        }
    }

    if request.needs_language {
        if let Some(l) = parsed.get("language").and_then(|v| v.as_str()) {
            if l.is_empty() || VALID_LANGUAGES.contains(&l) {
                result.language = Some(l.to_string());
            }
        }
    }

    if request.needs_tags {
        if let Some(arr) = parsed.get("tags").and_then(|v| v.as_array()) {
            let tags: Vec<String> = arr
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_lowercase()))
                .take(5)
                .collect();
            if !tags.is_empty() {
                result.tags = Some(tags);
            }
        }
    }

    if request.needs_folder {
        if let Some(f) = parsed.get("folder").and_then(|v| v.as_str()) {
            let sanitized = f.replace("..", "").replace('\\', "/");
            let folder = if sanitized.starts_with('/') {
                sanitized
            } else {
                format!("/{}", sanitized)
            };
            result.folder = Some(folder);
        }
    }

    if request.needs_description {
        if let Some(d) = parsed.get("description").and_then(|v| v.as_str()) {
            let desc: String = d.chars().take(100).collect();
            result.description = Some(desc);
        }
    }

    if request.needs_title {
        if let Some(t) = parsed.get("title").and_then(|v| v.as_str()) {
            let title = t.trim();
            if !title.is_empty() {
                result.title = Some(title.to_string());
            }
        }
    }

    Ok(result)
}

/// Categorize multiple items in a single AI call. Each item is a (title, content) pair.
/// Returns one CategorizationResult per item, in the same order.
pub async fn categorize_batch(
    provider: &dyn AiProvider,
    items: &[(String, String)],
    existing_tags: &[String],
    existing_folders: &[String],
) -> Result<Vec<CategorizationResult>, String> {
    if items.is_empty() {
        return Ok(Vec::new());
    }

    let mut system_prompt = String::from(
        "You are a categorization assistant for a developer knowledge base. \
         You will receive multiple items. For EACH item, return a categorization object.\n\n\
         Each object must have these fields:\n",
    );

    system_prompt.push_str(&format!(
        "- \"type\": one of [{}]\n",
        VALID_TYPES
            .iter()
            .map(|t| format!("\"{}\"", t))
            .collect::<Vec<_>>()
            .join(", ")
    ));
    system_prompt.push_str(&format!(
        "- \"language\": one of [{}] or empty string if not code\n",
        VALID_LANGUAGES
            .iter()
            .map(|l| format!("\"{}\"", l))
            .collect::<Vec<_>>()
            .join(", ")
    ));

    let mut tag_instruction = "- \"tags\": array of 1-5 short lowercase tags".to_string();
    if !existing_tags.is_empty() {
        tag_instruction.push_str(&format!(
            ". Prefer reusing from: [{}]",
            existing_tags
                .iter()
                .take(50)
                .map(|t| format!("\"{}\"", t))
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }
    system_prompt.push_str(&tag_instruction);
    system_prompt.push('\n');

    let folder_instruction = if !existing_folders.is_empty() {
        format!(
            "- \"folder\": MUST be one of these folders: [{}]. Do NOT invent new folders.",
            existing_folders
                .iter()
                .take(50)
                .map(|f| format!("\"{}\"", f))
                .collect::<Vec<_>>()
                .join(", ")
        )
    } else {
        "- \"folder\": a hierarchical path like \"/category\" or \"/category/subcategory\""
            .to_string()
    };
    system_prompt.push_str(&folder_instruction);
    system_prompt.push('\n');

    system_prompt
        .push_str("- \"description\": a concise one-line summary (max 100 chars)\n");

    system_prompt.push_str(
        "\nReturn a JSON array of objects, one per item, in the same order as the input. \
         Return ONLY valid JSON, no markdown fences, no explanation.",
    );

    // Build user message with numbered items
    let mut user_content = format!("Categorize these {} items:\n\n", items.len());
    for (i, (title, content)) in items.iter().enumerate() {
        let preview: String = content.chars().take(200).collect();
        user_content.push_str(&format!("[{}] Title: {}\nContent: {}\n\n", i, title, preview));
    }

    let messages = vec![
        AiMessage {
            role: "system".to_string(),
            content: system_prompt,
        },
        AiMessage {
            role: "user".to_string(),
            content: user_content,
        },
    ];

    let response = complete_with_retry(provider, messages).await?;
    parse_batch_response(&response.content, items.len())
}

fn parse_batch_response(
    raw: &str,
    expected_count: usize,
) -> Result<Vec<CategorizationResult>, String> {
    let json_str = raw.trim();
    let json_str = if json_str.starts_with("```") {
        let start = json_str.find('[').unwrap_or(0);
        let end = json_str
            .rfind(']')
            .map(|i| i + 1)
            .unwrap_or(json_str.len());
        &json_str[start..end]
    } else {
        json_str
    };

    let parsed: Vec<serde_json::Value> = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse batch AI response: {}", e))?;

    let mut results = Vec::with_capacity(expected_count);

    for (i, entry) in parsed.iter().enumerate().take(expected_count) {
        let mut result = CategorizationResult::default();

        if let Some(t) = entry.get("type").and_then(|v| v.as_str()) {
            if VALID_TYPES.contains(&t) {
                result.item_type = Some(t.to_string());
            }
        }

        if let Some(l) = entry.get("language").and_then(|v| v.as_str()) {
            if l.is_empty() || VALID_LANGUAGES.contains(&l) {
                result.language = Some(l.to_string());
            }
        }

        if let Some(arr) = entry.get("tags").and_then(|v| v.as_array()) {
            let tags: Vec<String> = arr
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_lowercase()))
                .take(5)
                .collect();
            if !tags.is_empty() {
                result.tags = Some(tags);
            }
        }

        if let Some(f) = entry.get("folder").and_then(|v| v.as_str()) {
            let sanitized = f.replace("..", "").replace('\\', "/");
            let folder = if sanitized.starts_with('/') {
                sanitized
            } else {
                format!("/{}", sanitized)
            };
            result.folder = Some(folder);
        }

        if let Some(d) = entry.get("description").and_then(|v| v.as_str()) {
            let desc: String = d.chars().take(100).collect();
            result.description = Some(desc);
        }

        results.push(result);
        let _ = i; // suppress unused warning
    }

    // Pad with defaults if AI returned fewer results than expected
    while results.len() < expected_count {
        results.push(CategorizationResult::default());
    }

    Ok(results)
}
