export interface Item {
  id: string;
  title: string;
  type: string;
  language: string;
  tags: string[];
  folder: string;
  description: string;
  content: string;
  file_path: string;
  file_hash: string;
  created: string;
  modified: string;
}

export interface CreateItemInput {
  title?: string;
  type?: string;
  language?: string;
  tags?: string[];
  folder?: string;
  description?: string;
  content: string;
}

export interface UpdateItemInput {
  id: string;
  title?: string;
  type?: string;
  language?: string;
  tags?: string[];
  folder?: string;
  description?: string;
  content?: string;
}

export type ItemType = "shell" | "snippet" | "config" | "note";

export const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "shell", label: "Shell Command" },
  { value: "snippet", label: "Code Snippet" },
  { value: "config", label: "Configuration" },
];

export interface AiSettings {
  provider: string;
  model: string;
  base_url: string;
  has_api_key: boolean;
  is_configured: boolean;
}

export interface AiSettingsInput {
  provider: string;
  model: string;
  api_key?: string;
  base_url?: string;
}

export const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "claude", label: "Claude" },
  { value: "ollama", label: "Ollama" },
];

export const LANGUAGES = [
  "bash",
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "json",
  "yaml",
  "toml",
  "sql",
  "html",
  "css",
  "markdown",
  "dockerfile",
  "terraform",
  "other",
];
