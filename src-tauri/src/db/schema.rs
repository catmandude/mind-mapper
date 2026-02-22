use rusqlite::{Connection, Result};

pub fn initialize_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            item_type TEXT NOT NULL DEFAULT 'note',
            language TEXT DEFAULT '',
            tags TEXT DEFAULT '',
            folder TEXT DEFAULT '/',
            description TEXT DEFAULT '',
            content TEXT DEFAULT '',
            file_path TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            created TEXT NOT NULL,
            modified TEXT NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
            id UNINDEXED,
            title,
            description,
            tags,
            content,
            content='items',
            content_rowid='rowid',
            tokenize='porter unicode61'
        );

        CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
            INSERT INTO items_fts(rowid, id, title, description, tags, content)
            VALUES (new.rowid, new.id, new.title, new.description, new.tags, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
            INSERT INTO items_fts(items_fts, rowid, id, title, description, tags, content)
            VALUES ('delete', old.rowid, old.id, old.title, old.description, old.tags, old.content);
        END;

        CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
            INSERT INTO items_fts(items_fts, rowid, id, title, description, tags, content)
            VALUES ('delete', old.rowid, old.id, old.title, old.description, old.tags, old.content);
            INSERT INTO items_fts(rowid, id, title, description, tags, content)
            VALUES (new.rowid, new.id, new.title, new.description, new.tags, new.content);
        END;

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )?;
    Ok(())
}
