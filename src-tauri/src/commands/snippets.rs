use crate::db::queries::{self, Item};
use crate::files::markdown;
use crate::state::AppState;
use chrono::Utc;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateItemInput {
    pub title: String,
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
    pub folder: Option<String>,
    pub description: Option<String>,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItemInput {
    pub id: String,
    pub title: Option<String>,
    #[serde(rename = "type")]
    pub item_type: Option<String>,
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
    pub folder: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
}

#[tauri::command]
pub fn create_item(state: State<AppState>, input: CreateItemInput) -> Result<Item, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let item = Item {
        id: id.clone(),
        title: input.title.clone(),
        item_type: input.item_type.unwrap_or_else(|| "note".to_string()),
        language: input.language.unwrap_or_default(),
        tags: input.tags.unwrap_or_default(),
        folder: input.folder.unwrap_or_else(|| "/".to_string()),
        description: input.description.unwrap_or_default(),
        content: input.content,
        file_path: String::new(), // Will be set after save
        file_hash: String::new(), // Will be set after save
        created: now.clone(),
        modified: now,
    };

    let data_dir = state.data_dir.lock().map_err(|e| e.to_string())?;
    let file_path = markdown::save_item_to_file(&data_dir, &item)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    // Read back to get the hash
    let raw = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let hash = markdown::compute_hash(&raw);

    let item = Item {
        file_path: file_path.to_string_lossy().to_string(),
        file_hash: hash,
        ..item
    };

    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::insert_item(&db, &item).map_err(|e| e.to_string())?;

    Ok(item)
}

#[tauri::command]
pub fn update_item(state: State<AppState>, input: UpdateItemInput) -> Result<Item, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let existing = queries::get_item(&db, &input.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Item not found".to_string())?;

    let now = Utc::now().to_rfc3339();

    let updated = Item {
        id: existing.id,
        title: input.title.unwrap_or(existing.title),
        item_type: input.item_type.unwrap_or(existing.item_type),
        language: input.language.unwrap_or(existing.language),
        tags: input.tags.unwrap_or(existing.tags),
        folder: input.folder.unwrap_or(existing.folder),
        description: input.description.unwrap_or(existing.description),
        content: input.content.unwrap_or(existing.content),
        file_path: existing.file_path.clone(),
        file_hash: String::new(),
        created: existing.created,
        modified: now,
    };

    // Delete old file if title changed (filename changes)
    let data_dir = state.data_dir.lock().map_err(|e| e.to_string())?;
    let new_path = markdown::item_file_path(&data_dir, &updated.title, &updated.id);
    let new_path_str = new_path.to_string_lossy().to_string();

    if existing.file_path != new_path_str {
        let _ = std::fs::remove_file(&existing.file_path);
    }

    let file_path = markdown::save_item_to_file(&data_dir, &updated)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    let raw = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let hash = markdown::compute_hash(&raw);

    let updated = Item {
        file_path: file_path.to_string_lossy().to_string(),
        file_hash: hash,
        ..updated
    };

    queries::insert_item(&db, &updated).map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_item(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let item = queries::get_item(&db, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Item not found".to_string())?;

    // Delete file
    let _ = std::fs::remove_file(&item.file_path);

    // Delete from DB
    queries::delete_item(&db, &id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_item(state: State<AppState>, id: String) -> Result<Option<Item>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_item(&db, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_items(state: State<AppState>) -> Result<Vec<Item>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::list_items(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_tags(state: State<AppState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_all_tags(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_folders(state: State<AppState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_all_folders(&db).map_err(|e| e.to_string())
}
