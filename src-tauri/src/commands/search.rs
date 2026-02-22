use crate::db::queries::{self, Item};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn search_items(state: State<AppState>, query: String) -> Result<Vec<Item>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::search_items(&db, &query).map_err(|e| e.to_string())
}
