use crate::db::queries::Item;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Frontmatter {
    pub id: String,
    pub title: String,
    #[serde(rename = "type", default = "default_type")]
    pub item_type: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_folder")]
    pub folder: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub created: String,
    #[serde(default)]
    pub modified: String,
}

fn default_type() -> String {
    "note".to_string()
}

fn default_folder() -> String {
    "/".to_string()
}

pub fn parse_markdown_file(path: &Path) -> Result<Item, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;
    let hash = compute_hash(&raw);
    parse_markdown_content(&raw, path, &hash)
}

pub fn parse_markdown_content(raw: &str, path: &Path, hash: &str) -> Result<Item, String> {
    let (frontmatter, content) = split_frontmatter(raw)?;
    let fm: Frontmatter =
        serde_yaml::from_str(&frontmatter).map_err(|e| format!("Failed to parse frontmatter: {}", e))?;

    Ok(Item {
        id: fm.id,
        title: fm.title,
        item_type: fm.item_type,
        language: fm.language,
        tags: fm.tags,
        folder: fm.folder,
        description: fm.description,
        content: content.trim().to_string(),
        file_path: path.to_string_lossy().to_string(),
        file_hash: hash.to_string(),
        created: fm.created,
        modified: fm.modified,
    })
}

fn split_frontmatter(raw: &str) -> Result<(String, String), String> {
    let trimmed = raw.trim_start();
    if !trimmed.starts_with("---") {
        return Err("File does not start with frontmatter delimiter ---".to_string());
    }

    let after_first = &trimmed[3..];
    let end = after_first
        .find("\n---")
        .ok_or("Missing closing frontmatter delimiter ---")?;

    let frontmatter = after_first[..end].trim().to_string();
    let content = after_first[end + 4..].to_string();

    Ok((frontmatter, content))
}

pub fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn item_to_markdown(item: &Item) -> String {
    let fm = Frontmatter {
        id: item.id.clone(),
        title: item.title.clone(),
        item_type: item.item_type.clone(),
        language: item.language.clone(),
        tags: item.tags.clone(),
        folder: item.folder.clone(),
        description: item.description.clone(),
        created: item.created.clone(),
        modified: item.modified.clone(),
    };

    let yaml = serde_yaml::to_string(&fm).unwrap_or_default();
    format!("---\n{}---\n\n{}\n", yaml, item.content)
}

pub fn generate_filename(title: &str, id: &str) -> String {
    let s = slug::slugify(title);
    let short_id = &id[..8.min(id.len())];
    format!("{}-{}.md", s, short_id)
}

pub fn item_file_path(data_dir: &Path, title: &str, id: &str) -> PathBuf {
    data_dir.join(generate_filename(title, id))
}

pub fn save_item_to_file(data_dir: &Path, item: &Item) -> Result<PathBuf, String> {
    let file_path = item_file_path(data_dir, &item.title, &item.id);
    let markdown = item_to_markdown(item);
    fs::write(&file_path, &markdown).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(file_path)
}
