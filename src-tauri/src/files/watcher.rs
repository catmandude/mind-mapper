use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;

pub struct FileWatcher {
    _watcher: RecommendedWatcher,
}

impl FileWatcher {
    pub fn new<F>(data_dir: PathBuf, callback: F) -> Result<Self, String>
    where
        F: Fn(Vec<PathBuf>, Vec<PathBuf>) + Send + 'static,
    {
        let (tx, rx) = mpsc::channel();

        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        })
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        watcher
            .watch(&data_dir, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch directory: {}", e))?;

        // Spawn debounce thread
        std::thread::spawn(move || {
            let debounce = Duration::from_millis(500);
            loop {
                let mut changed: Vec<PathBuf> = Vec::new();
                let mut removed: Vec<PathBuf> = Vec::new();

                // Wait for first event
                match rx.recv() {
                    Ok(event) => process_event(&event, &mut changed, &mut removed),
                    Err(_) => break,
                }

                // Collect events during debounce window
                loop {
                    match rx.recv_timeout(debounce) {
                        Ok(event) => process_event(&event, &mut changed, &mut removed),
                        Err(mpsc::RecvTimeoutError::Timeout) => break,
                        Err(mpsc::RecvTimeoutError::Disconnected) => return,
                    }
                }

                // Deduplicate
                changed.sort();
                changed.dedup();
                removed.sort();
                removed.dedup();

                // Filter to .md files only
                changed.retain(|p| p.extension().is_some_and(|e| e == "md"));
                removed.retain(|p| p.extension().is_some_and(|e| e == "md"));

                if !changed.is_empty() || !removed.is_empty() {
                    callback(changed, removed);
                }
            }
        });

        Ok(FileWatcher {
            _watcher: watcher,
        })
    }
}

fn process_event(event: &Event, changed: &mut Vec<PathBuf>, removed: &mut Vec<PathBuf>) {
    match event.kind {
        EventKind::Create(_) | EventKind::Modify(_) => {
            changed.extend(event.paths.clone());
        }
        EventKind::Remove(_) => {
            removed.extend(event.paths.clone());
        }
        _ => {}
    }
}
