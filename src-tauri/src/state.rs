use crate::ai::provider::AiProvider;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub data_dir: Mutex<PathBuf>,
    pub ai_provider: RwLock<Option<Arc<dyn AiProvider>>>,
}

impl AppState {
    pub fn new(db: Connection, data_dir: PathBuf) -> Self {
        Self {
            db: Mutex::new(db),
            data_dir: Mutex::new(data_dir),
            ai_provider: RwLock::new(None),
        }
    }
}
