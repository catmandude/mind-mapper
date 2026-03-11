use crate::db::queries;
use crate::files::markdown;
use rusqlite::Connection;
use std::collections::HashSet;
use std::fs;
use std::path::Path;

/// Full reconciliation: scan all .md files in data_dir and sync with DB.
/// Returns (added, updated, removed) counts.
pub fn reconcile(conn: &Connection, data_dir: &Path) -> Result<(usize, usize, usize), String> {
    let mut added = 0;
    let mut updated = 0;
    let mut removed = 0;

    let mut seen_paths = HashSet::new();

    // Scan all .md files in data directory
    let entries = fs::read_dir(data_dir).map_err(|e| format!("Failed to read data dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|e| e == "md") {
            let path_str = path.to_string_lossy().to_string();
            seen_paths.insert(path_str.clone());

            let raw = match fs::read_to_string(&path) {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("Reconcile: failed to read {}: {}", path.display(), e);
                    continue;
                }
            };
            let hash = markdown::compute_hash(&raw);

            // Check if file is already in DB with same hash
            match queries::get_file_hash(conn, &path_str) {
                Ok(Some(existing_hash)) if existing_hash == hash => continue,
                Ok(Some(_)) => {
                    // File changed, re-parse and update
                    match markdown::parse_markdown_content(&raw, &path, &hash) {
                        Ok(item) => {
                            if let Err(e) = queries::insert_item(conn, &item) {
                                eprintln!("Reconcile: failed to update DB for {}: {}", path.display(), e);
                            } else {
                                updated += 1;
                            }
                        }
                        Err(e) => eprintln!("Reconcile: failed to parse {}: {}", path.display(), e),
                    }
                }
                Ok(None) => {
                    // New file
                    match markdown::parse_markdown_content(&raw, &path, &hash) {
                        Ok(item) => {
                            if let Err(e) = queries::insert_item(conn, &item) {
                                eprintln!("Reconcile: failed to insert DB for {}: {}", path.display(), e);
                            } else {
                                added += 1;
                            }
                        }
                        Err(e) => eprintln!("Reconcile: failed to parse {}: {}", path.display(), e),
                    }
                }
                Err(e) => {
                    eprintln!("Reconcile: failed to check hash for {}: {}", path.display(), e);
                    continue;
                }
            }
        }
    }

    // Remove DB entries for files that no longer exist
    let all_items = match queries::list_items(conn) {
        Ok(items) => items,
        Err(e) => {
            eprintln!("Reconcile: failed to list items for cleanup: {}", e);
            return Ok((added, updated, removed));
        }
    };
    for item in all_items {
        if !seen_paths.contains(&item.file_path) {
            if let Err(e) = queries::delete_item(conn, &item.id) {
                eprintln!("Reconcile: failed to remove orphaned item {}: {}", item.id, e);
            } else {
                removed += 1;
            }
        }
    }

    Ok((added, updated, removed))
}

/// Process file changes from watcher
pub fn process_changes(
    conn: &Connection,
    changed: &[std::path::PathBuf],
    removed: &[std::path::PathBuf],
) {
    for path in changed {
        match markdown::parse_markdown_file(path) {
            Ok(item) => {
                if let Err(e) = queries::insert_item(conn, &item) {
                    eprintln!("Watcher: failed to sync {} to DB: {}", path.display(), e);
                }
            }
            Err(e) => eprintln!("Watcher: failed to parse {}: {}", path.display(), e),
        }
    }

    for path in removed {
        let path_str = path.to_string_lossy().to_string();
        if let Err(e) = queries::delete_item_by_path(conn, &path_str) {
            eprintln!("Watcher: failed to remove {} from DB: {}", path.display(), e);
        }
    }
}
