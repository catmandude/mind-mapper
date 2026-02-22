mod ai;
mod commands;
mod db;
mod files;
mod state;

use commands::{search, settings, snippets};
use rusqlite::Connection;
use state::AppState;
use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, Emitter,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

fn get_data_dir() -> PathBuf {
    let dir = dirs::document_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("MindMapper");
    fs::create_dir_all(&dir).expect("Failed to create data directory");
    dir
}

fn get_db_path() -> PathBuf {
    let app_support = dirs::data_local_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("com.austinmiller.mind-mapper");
    fs::create_dir_all(&app_support).expect("Failed to create app support directory");
    app_support.join("mind-mapper.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = get_data_dir();
    let db_path = get_db_path();

    let conn = Connection::open(&db_path).expect("Failed to open database");
    db::schema::initialize_db(&conn).expect("Failed to initialize database schema");

    // Run initial reconciliation
    match files::sync::reconcile(&conn, &data_dir) {
        Ok((added, updated, removed)) => {
            if added > 0 || updated > 0 || removed > 0 {
                println!(
                    "Reconciliation: {} added, {} updated, {} removed",
                    added, updated, removed
                );
            }
        }
        Err(e) => eprintln!("Reconciliation error: {}", e),
    }

    let app_state = AppState::new(conn, data_dir.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(app_state)
        .setup(move |app| {
            // Set up system tray
            let quit = MenuItem::with_id(app, "quit", "Quit MindMapper", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show MindMapper", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("MindMapper")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Set up file watcher
            let app_handle = app.handle().clone();
            let watch_dir = data_dir.clone();
            let _watcher = files::watcher::FileWatcher::new(watch_dir, move |changed, removed| {
                let state = app_handle.state::<AppState>();
                let db = state.db.lock().unwrap();
                files::sync::process_changes(&db, &changed, &removed);
                drop(db);
            });

            // Set up global shortcut
            app.global_shortcut().on_shortcut(
                "CommandOrControl+Shift+Space",
                move |app: &tauri::AppHandle, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("search") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("search-focus", ());
                            }
                        }
                    }
                },
            )?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            snippets::create_item,
            snippets::update_item,
            snippets::delete_item,
            snippets::get_item,
            snippets::list_items,
            snippets::get_all_tags,
            snippets::get_all_folders,
            search::search_items,
            settings::get_setting,
            settings::set_setting,
            settings::get_data_dir,
        ])
        .on_window_event(|window, event| {
            // Hide search window on blur instead of closing
            if window.label() == "search" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
