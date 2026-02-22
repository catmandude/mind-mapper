use crate::ai::categorize;
use crate::ai::provider::AiConfig;
use crate::state::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize)]
pub struct AiSettings {
    pub provider: String,
    pub model: String,
    pub base_url: String,
    pub has_api_key: bool,
    pub is_configured: bool,
}

#[derive(Debug, Deserialize)]
pub struct AiSettingsInput {
    pub provider: String,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}

fn get_ai_setting(db: &rusqlite::Connection, key: &str) -> Option<String> {
    let mut stmt = db
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .ok()?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0)).ok()?;
    rows.next()?.ok()
}

fn set_ai_setting(db: &rusqlite::Connection, key: &str, value: &str) -> Result<(), String> {
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn read_ai_config(db: &rusqlite::Connection) -> Option<AiConfig> {
    let provider = get_ai_setting(db, "ai_provider")?;
    let model = get_ai_setting(db, "ai_model").unwrap_or_default();
    let api_key = get_ai_setting(db, "ai_api_key").unwrap_or_default();
    let base_url = get_ai_setting(db, "ai_base_url");

    if provider.is_empty() || (provider != "ollama" && api_key.is_empty()) {
        return None;
    }

    Some(AiConfig {
        provider,
        model,
        api_key,
        base_url,
    })
}

pub async fn rebuild_ai_provider(state: &AppState) {
    let config = {
        let db = state.db.lock().unwrap();
        read_ai_config(&db)
    };

    let provider = config.map(|c| categorize::create_provider(&c));
    let mut guard = state.ai_provider.write().await;
    *guard = provider;
}

#[tauri::command]
pub fn get_ai_settings(state: State<AppState>) -> Result<AiSettings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let provider = get_ai_setting(&db, "ai_provider").unwrap_or_default();
    let model = get_ai_setting(&db, "ai_model").unwrap_or_default();
    let base_url = get_ai_setting(&db, "ai_base_url").unwrap_or_default();
    let has_api_key = get_ai_setting(&db, "ai_api_key")
        .map(|k| !k.is_empty())
        .unwrap_or(false);

    let is_configured = !provider.is_empty() && (provider == "ollama" || has_api_key);

    Ok(AiSettings {
        provider,
        model,
        base_url,
        has_api_key,
        is_configured,
    })
}

#[tauri::command]
pub async fn set_ai_settings(
    state: State<'_, AppState>,
    input: AiSettingsInput,
) -> Result<AiSettings, String> {
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        set_ai_setting(&db, "ai_provider", &input.provider)?;
        set_ai_setting(&db, "ai_model", &input.model)?;
        if let Some(ref key) = input.api_key {
            set_ai_setting(&db, "ai_api_key", key)?;
        }
        set_ai_setting(
            &db,
            "ai_base_url",
            &input.base_url.unwrap_or_default(),
        )?;
    }

    rebuild_ai_provider(&state).await;
    get_ai_settings(state)
}
