use crate::ai::categorize::{self, CategorizationRequest};
use crate::db::queries::{self, Item};
use crate::files::markdown;
use crate::state::AppState;
use chrono::Utc;
use serde::Deserialize;
use std::sync::Arc;
use tauri::{Emitter, Manager, State};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateItemInput {
    pub title: Option<String>,
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

/// Check which fields were left as defaults and could benefit from AI categorization.
fn needs_enrichment(item: &Item, input_type: &Option<String>, input_lang: &Option<String>, input_tags: &Option<Vec<String>>, input_folder: &Option<String>, input_desc: &Option<String>) -> Option<CategorizationRequest> {
    let needs_type = input_type.is_none() || item.item_type == "note";
    let needs_language = input_lang.is_none() || item.language.is_empty();
    let needs_tags = input_tags.is_none() || item.tags.is_empty();
    let needs_folder = input_folder.is_none() || item.folder == "/";
    let needs_description = input_desc.is_none() || item.description.is_empty();
    let needs_title = item.title.starts_with("Untitled-");

    if !needs_type && !needs_language && !needs_tags && !needs_folder && !needs_description && !needs_title {
        return None;
    }

    Some(CategorizationRequest {
        title: item.title.clone(),
        content: item.content.clone(),
        needs_type,
        needs_language,
        needs_tags,
        needs_folder,
        needs_description,
        needs_title,
        existing_tags: Vec::new(),
        existing_folders: Vec::new(),
    })
}

fn spawn_enrichment(
    app_handle: tauri::AppHandle,
    item_id: String,
    mut request: CategorizationRequest,
) {
    tauri::async_runtime::spawn(async move {
        let state = app_handle.state::<AppState>();

        // Get the AI provider (read lock, non-blocking for other readers)
        let provider: Arc<dyn crate::ai::provider::AiProvider> = {
            let guard = state.ai_provider.read().await;
            match guard.clone() {
                Some(p) => p,
                None => return,
            }
        };

        // Gather existing vocabulary from DB (don't hold lock across await)
        {
            let db = match state.db.lock() {
                Ok(db) => db,
                Err(_) => return,
            };
            request.existing_tags = queries::get_all_tags(&db).unwrap_or_default();
            request.existing_folders = queries::get_all_folders(&db).unwrap_or_default();
        }

        // Call AI (this is the async network call)
        let result = match categorize::categorize(provider.as_ref(), &request).await {
            Ok(r) => r,
            Err(e) => {
                eprintln!("AI categorization failed for {}: {}", item_id, e);
                return;
            }
        };

        // Apply results: read item, merge, save file, update DB
        let updated = {
            let db = match state.db.lock() {
                Ok(db) => db,
                Err(_) => return,
            };

            let item = match queries::get_item(&db, &item_id) {
                Ok(Some(item)) => item,
                _ => return,
            };

            let mut changed = false;
            let mut updated = item;

            if let Some(ref t) = result.item_type {
                if request.needs_type {
                    updated.item_type = t.clone();
                    changed = true;
                }
            }
            if let Some(ref l) = result.language {
                if request.needs_language {
                    updated.language = l.clone();
                    changed = true;
                }
            }
            if let Some(ref tags) = result.tags {
                if request.needs_tags {
                    updated.tags = tags.clone();
                    changed = true;
                }
            }
            if let Some(ref f) = result.folder {
                if request.needs_folder {
                    updated.folder = f.clone();
                    changed = true;
                }
            }
            if let Some(ref d) = result.description {
                if request.needs_description {
                    updated.description = d.clone();
                    changed = true;
                }
            }

            let title_changed = if let Some(ref t) = result.title {
                if request.needs_title {
                    updated.title = t.clone();
                    changed = true;
                    true
                } else {
                    false
                }
            } else {
                false
            };

            if !changed {
                return;
            }

            updated.modified = Utc::now().to_rfc3339();

            // Save to file
            let data_dir: std::path::PathBuf = match state.data_dir.lock() {
                Ok(d) => d.clone(),
                Err(_) => return,
            };

            // If title changed, delete the old file (old placeholder filename)
            if title_changed {
                let old_path = &updated.file_path;
                let _ = std::fs::remove_file(old_path);
            }

            if let Err(e) = markdown::save_item_to_file(&data_dir, &updated) {
                eprintln!("Failed to save enriched item file: {}", e);
                return;
            }

            // Recompute hash
            let file_path = markdown::item_file_path(&data_dir, &updated.title, &updated.id);
            let raw = match std::fs::read_to_string(&file_path) {
                Ok(r) => r,
                Err(_) => return,
            };
            let hash = markdown::compute_hash(&raw);
            updated.file_path = file_path.to_string_lossy().to_string();
            updated.file_hash = hash;

            // Update DB
            if let Err(e) = queries::insert_item(&db, &updated) {
                eprintln!("Failed to update enriched item in DB: {}", e);
                return;
            }

            updated
        };

        // Emit event so frontend refreshes
        let _ = app_handle.emit("items-changed", &updated.id);
    });
}

#[tauri::command]
pub fn create_item(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    input: CreateItemInput,
) -> Result<Item, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let input_type = input.item_type.clone();
    let input_lang = input.language.clone();
    let input_tags = input.tags.clone();
    let input_folder = input.folder.clone();
    let input_desc = input.description.clone();

    let title = input.title.unwrap_or_else(|| format!("Untitled-{}", &id[..8]));

    let item = Item {
        id: id.clone(),
        title,
        item_type: input.item_type.unwrap_or_else(|| "note".to_string()),
        language: input.language.unwrap_or_default(),
        tags: input.tags.unwrap_or_default(),
        folder: input.folder.unwrap_or_else(|| "/".to_string()),
        description: input.description.unwrap_or_default(),
        content: input.content,
        file_path: String::new(),
        file_hash: String::new(),
        created: now.clone(),
        modified: now,
    };

    let data_dir = state.data_dir.lock().map_err(|e| e.to_string())?;
    let file_path = markdown::save_item_to_file(&data_dir, &item)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    let raw = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let hash = markdown::compute_hash(&raw);

    let item = Item {
        file_path: file_path.to_string_lossy().to_string(),
        file_hash: hash,
        ..item
    };

    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::insert_item(&db, &item).map_err(|e| e.to_string())?;
    drop(db);
    drop(data_dir);

    // Check if AI enrichment is needed
    if let Some(request) = needs_enrichment(&item, &input_type, &input_lang, &input_tags, &input_folder, &input_desc) {
        spawn_enrichment(app_handle, item.id.clone(), request);
    }

    Ok(item)
}

#[tauri::command]
pub fn update_item(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    input: UpdateItemInput,
) -> Result<Item, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let existing = queries::get_item(&db, &input.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Item not found".to_string())?;

    let now = Utc::now().to_rfc3339();

    let input_type = input.item_type.clone();
    let input_lang = input.language.clone();
    let input_tags = input.tags.clone();
    let input_folder = input.folder.clone();
    let input_desc = input.description.clone();

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
    drop(db);
    drop(data_dir);

    // Check if AI enrichment is needed
    if let Some(request) = needs_enrichment(&updated, &input_type, &input_lang, &input_tags, &input_folder, &input_desc) {
        spawn_enrichment(app_handle, updated.id.clone(), request);
    }

    Ok(updated)
}

#[tauri::command]
pub fn delete_item(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let item = queries::get_item(&db, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Item not found".to_string())?;

    let _ = std::fs::remove_file(&item.file_path);
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
