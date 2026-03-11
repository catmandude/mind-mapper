use crate::ai::categorize::{self, CategorizationRequest, CategorizationResult};
use crate::ai::provider::AiProvider;
use crate::ai::taxonomy;
use crate::db::queries;
use crate::files::markdown;
use crate::state::AppState;
use chrono::Utc;
use serde::Serialize;
use std::sync::Arc;
use tauri::{Emitter, Manager, State};

const BATCH_SIZE: usize = 10;
const DEFAULT_MAX_FOLDERS: usize = 10;

#[derive(Debug, Clone, Serialize)]
pub struct RecategorizeProgress {
    pub phase: String,
    pub current: usize,
    pub total: usize,
    pub message: String,
}

#[tauri::command]
pub async fn recategorize_all(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    include_manual: bool,
    max_folders: Option<usize>,
) -> Result<(), String> {
    let max_folders = max_folders.unwrap_or(DEFAULT_MAX_FOLDERS);
    // Validate AI provider is configured
    let provider: Arc<dyn AiProvider> = {
        let guard = state.ai_provider.read().await;
        guard
            .clone()
            .ok_or_else(|| "AI provider not configured".to_string())?
    };

    // Load all items from DB
    let all_items: Vec<queries::Item> = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        queries::list_items(&db).map_err(|e| e.to_string())?
    };

    if all_items.is_empty() {
        return Ok(());
    }

    // Filter items for Pass 2
    let filtered_items: Vec<queries::Item> = if include_manual {
        all_items.clone()
    } else {
        all_items
            .iter()
            .filter(|item| item.folder == "/" || item.folder.is_empty())
            .cloned()
            .collect()
    };

    if filtered_items.is_empty() {
        return Ok(());
    }

    // Get existing tags for categorization
    let existing_tags: Vec<String> = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        queries::get_all_tags(&db).unwrap_or_default()
    };

    // Spawn background task so command returns immediately
    tauri::async_runtime::spawn(async move {
        let state = app_handle.state::<AppState>();

        // Pass 1: Generate taxonomy from ALL items
        let _ = app_handle.emit(
            "recategorize-progress",
            RecategorizeProgress {
                phase: "taxonomy".to_string(),
                current: 0,
                total: 1,
                message: "Generating folder taxonomy...".to_string(),
            },
        );

        let taxonomy = match taxonomy::generate_taxonomy(provider.as_ref(), &all_items, max_folders).await {
            Ok(t) => t,
            Err(e) => {
                eprintln!("Taxonomy generation failed: {}", e);
                let _ = app_handle.emit(
                    "recategorize-progress",
                    RecategorizeProgress {
                        phase: "error".to_string(),
                        current: 0,
                        total: 0,
                        message: format!("Taxonomy generation failed: {}", e),
                    },
                );
                return;
            }
        };

        let _ = app_handle.emit(
            "recategorize-progress",
            RecategorizeProgress {
                phase: "taxonomy".to_string(),
                current: 1,
                total: 1,
                message: format!("Generated {} folders", taxonomy.len()),
            },
        );

        // Pass 2: Categorize filtered items in batches
        let total = filtered_items.len();

        for chunk_start in (0..total).step_by(BATCH_SIZE) {
            let chunk_end = (chunk_start + BATCH_SIZE).min(total);
            let chunk = &filtered_items[chunk_start..chunk_end];

            let _ = app_handle.emit(
                "recategorize-progress",
                RecategorizeProgress {
                    phase: "categorize".to_string(),
                    current: chunk_start,
                    total,
                    message: format!(
                        "Categorizing items {}-{} of {}",
                        chunk_start + 1,
                        chunk_end,
                        total
                    ),
                },
            );

            // Build batch input
            let batch_items: Vec<(String, String)> = chunk
                .iter()
                .map(|item| (item.title.clone(), item.content.clone()))
                .collect();

            // Try batch categorization first
            let results: Vec<CategorizationResult> = match categorize::categorize_batch(
                provider.as_ref(),
                &batch_items,
                &existing_tags,
                &taxonomy,
            )
            .await
            {
                Ok(r) => r,
                Err(e) => {
                    eprintln!(
                        "Batch categorization failed for items {}-{}, falling back to individual: {}",
                        chunk_start + 1,
                        chunk_end,
                        e
                    );
                    // Fall back to individual categorization
                    let mut fallback_results = Vec::with_capacity(chunk.len());
                    for item in chunk {
                        let request = CategorizationRequest {
                            title: item.title.clone(),
                            content: item.content.clone(),
                            needs_type: true,
                            needs_language: true,
                            needs_tags: true,
                            needs_folder: true,
                            needs_description: true,
                            needs_title: false,
                            existing_tags: existing_tags.clone(),
                            existing_folders: taxonomy.clone(),
                        };
                        match categorize::categorize(provider.as_ref(), &request).await {
                            Ok(r) => fallback_results.push(r),
                            Err(e2) => {
                                eprintln!("Individual categorization failed for '{}': {}", item.title, e2);
                                fallback_results.push(CategorizationResult::default());
                            }
                        }
                    }
                    fallback_results
                }
            };

            // Apply results to each item in the chunk
            for (item, result) in chunk.iter().zip(results.iter()) {
                let mut updated = item.clone();
                let mut changed = false;

                if let Some(ref t) = result.item_type {
                    updated.item_type = t.clone();
                    changed = true;
                }
                if let Some(ref l) = result.language {
                    updated.language = l.clone();
                    changed = true;
                }
                if let Some(ref tags) = result.tags {
                    updated.tags = tags.clone();
                    changed = true;
                }
                if let Some(ref f) = result.folder {
                    updated.folder = f.clone();
                    changed = true;
                }
                if let Some(ref d) = result.description {
                    updated.description = d.clone();
                    changed = true;
                }

                if !changed {
                    continue;
                }

                updated.modified = Utc::now().to_rfc3339();

                // Save to file and update DB
                let data_dir = match state.data_dir.lock() {
                    Ok(d) => d.clone(),
                    Err(_) => continue,
                };

                if let Err(e) = markdown::save_item_to_file(&data_dir, &updated) {
                    eprintln!("Failed to save file for '{}': {}", updated.title, e);
                    continue;
                }

                let file_path =
                    markdown::item_file_path(&data_dir, &updated.title, &updated.id);
                let raw = match std::fs::read_to_string(&file_path) {
                    Ok(r) => r,
                    Err(_) => continue,
                };
                let hash = markdown::compute_hash(&raw);
                updated.file_path = file_path.to_string_lossy().to_string();
                updated.file_hash = hash;

                let db = match state.db.lock() {
                    Ok(db) => db,
                    Err(_) => continue,
                };
                if let Err(e) = queries::insert_item(&db, &updated) {
                    eprintln!("Failed to update DB for '{}': {}", updated.title, e);
                }
            }
        }

        // Emit completion
        let _ = app_handle.emit(
            "recategorize-progress",
            RecategorizeProgress {
                phase: "done".to_string(),
                current: total,
                total,
                message: format!("Recategorized {} items", total),
            },
        );

        let _ = app_handle.emit("items-changed", "recategorize");
    });

    Ok(())
}
