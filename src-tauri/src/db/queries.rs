use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub language: String,
    pub tags: Vec<String>,
    pub folder: String,
    pub description: String,
    pub content: String,
    pub file_path: String,
    pub file_hash: String,
    pub created: String,
    pub modified: String,
}

impl Item {
    pub fn tags_string(&self) -> String {
        self.tags.join(",")
    }

    pub fn from_row(row: &rusqlite::Row) -> Result<Self> {
        let tags_str: String = row.get(4)?;
        Ok(Item {
            id: row.get(0)?,
            title: row.get(1)?,
            item_type: row.get(2)?,
            language: row.get(3)?,
            tags: tags_str
                .split(',')
                .filter(|s| !s.is_empty())
                .map(|s| s.trim().to_string())
                .collect(),
            folder: row.get(5)?,
            description: row.get(6)?,
            content: row.get(7)?,
            file_path: row.get(8)?,
            file_hash: row.get(9)?,
            created: row.get(10)?,
            modified: row.get(11)?,
        })
    }
}

pub fn insert_item(conn: &Connection, item: &Item) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO items (id, title, item_type, language, tags, folder, description, content, file_path, file_hash, created, modified)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            item.id,
            item.title,
            item.item_type,
            item.language,
            item.tags_string(),
            item.folder,
            item.description,
            item.content,
            item.file_path,
            item.file_hash,
            item.created,
            item.modified,
        ],
    )?;
    Ok(())
}

pub fn delete_item(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM items WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_item(conn: &Connection, id: &str) -> Result<Option<Item>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, item_type, language, tags, folder, description, content, file_path, file_hash, created, modified
         FROM items WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], Item::from_row)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn list_items(conn: &Connection) -> Result<Vec<Item>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, item_type, language, tags, folder, description, content, file_path, file_hash, created, modified
         FROM items ORDER BY modified DESC",
    )?;
    let rows = stmt.query_map([], Item::from_row)?;
    rows.collect()
}

pub fn search_items(conn: &Connection, query: &str) -> Result<Vec<Item>> {
    if query.trim().is_empty() {
        return list_items(conn);
    }

    // Build FTS5 query: add prefix matching with *
    let fts_query = query
        .split_whitespace()
        .map(|word| format!("\"{}\"*", word.replace('"', "")))
        .collect::<Vec<_>>()
        .join(" ");

    let mut stmt = conn.prepare(
        "SELECT i.id, i.title, i.item_type, i.language, i.tags, i.folder, i.description, i.content, i.file_path, i.file_hash, i.created, i.modified
         FROM items i
         JOIN items_fts f ON i.id = f.id
         WHERE items_fts MATCH ?1
         ORDER BY bm25(items_fts, 0.0, 10.0, 5.0, 3.0, 1.0)",
    )?;
    let rows = stmt.query_map(params![fts_query], Item::from_row)?;
    rows.collect()
}

pub fn get_all_tags(conn: &Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT DISTINCT tags FROM items WHERE tags != ''")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut tags = std::collections::HashSet::new();
    for row in rows {
        let tag_str = row?;
        for tag in tag_str.split(',') {
            let t = tag.trim().to_string();
            if !t.is_empty() {
                tags.insert(t);
            }
        }
    }
    let mut result: Vec<String> = tags.into_iter().collect();
    result.sort();
    Ok(result)
}

pub fn get_all_folders(conn: &Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT DISTINCT folder FROM items ORDER BY folder")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    rows.collect()
}

pub fn get_file_hash(conn: &Connection, file_path: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT file_hash FROM items WHERE file_path = ?1")?;
    let mut rows = stmt.query_map(params![file_path], |row| row.get::<_, String>(0))?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn delete_item_by_path(conn: &Connection, file_path: &str) -> Result<()> {
    conn.execute("DELETE FROM items WHERE file_path = ?1", params![file_path])?;
    Ok(())
}
