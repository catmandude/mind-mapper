use super::provider::{AiMessage, AiProvider};
use super::retry::complete_with_retry;

pub async fn generate_taxonomy(
    provider: &dyn AiProvider,
    items: &[crate::db::queries::Item],
    max_folders: usize,
) -> Result<Vec<String>, String> {
    let mut summaries = String::new();
    for item in items {
        let preview: String = item.content.chars().take(100).collect();
        summaries.push_str(&format!("- {}: {}\n", item.title, preview));
    }

    let system_prompt = format!(
        "You are a knowledge base organizer. Given a list of developer items \
        (commands, snippets, configs, notes), design a hierarchical folder structure that \
        logically organizes them all.\n\n\
        Rules:\n\
        - Each folder path must start with \"/\"\n\
        - Use 1-2 levels of hierarchy (e.g. \"/docker\", \"/git/workflows\")\n\
        - Return EXACTLY {} folders — no more, no fewer. Group broadly so every item fits.\n\
        - Use lowercase, short descriptive names\n\
        - Prefer broad categories over narrow ones. Multiple related items should share a folder.\n\n\
        Return ONLY a JSON array of folder path strings, no markdown fences, no explanation.",
        max_folders
    );

    let messages = vec![
        AiMessage {
            role: "system".to_string(),
            content: system_prompt.to_string(),
        },
        AiMessage {
            role: "user".to_string(),
            content: format!(
                "Here are {} items to organize:\n\n{}",
                items.len(),
                summaries
            ),
        },
    ];

    let response = complete_with_retry(provider, messages).await?;
    parse_taxonomy_response(&response.content, max_folders)
}

fn parse_taxonomy_response(raw: &str, max_folders: usize) -> Result<Vec<String>, String> {
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

    let parsed: Vec<String> = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse taxonomy response: {}", e))?;

    let folders: Vec<String> = parsed
        .into_iter()
        .take(max_folders)
        .map(|f| {
            if f.starts_with('/') {
                f
            } else {
                format!("/{}", f)
            }
        })
        .collect();

    if folders.is_empty() {
        return Err("AI returned empty taxonomy".to_string());
    }

    Ok(folders)
}
