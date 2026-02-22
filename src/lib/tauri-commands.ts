import { invoke } from "@tauri-apps/api/core";
import type { Item, CreateItemInput, UpdateItemInput, AiSettings, AiSettingsInput } from "../types";

export async function createItem(input: CreateItemInput): Promise<Item> {
  return invoke("create_item", { input });
}

export async function updateItem(input: UpdateItemInput): Promise<Item> {
  return invoke("update_item", { input });
}

export async function deleteItem(id: string): Promise<void> {
  return invoke("delete_item", { id });
}

export async function getItem(id: string): Promise<Item | null> {
  return invoke("get_item", { id });
}

export async function listItems(): Promise<Item[]> {
  return invoke("list_items");
}

export async function searchItems(query: string): Promise<Item[]> {
  return invoke("search_items", { query });
}

export async function getAllTags(): Promise<string[]> {
  return invoke("get_all_tags");
}

export async function getAllFolders(): Promise<string[]> {
  return invoke("get_all_folders");
}

export async function getSetting(key: string): Promise<string | null> {
  return invoke("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return invoke("set_setting", { key, value });
}

export async function getDataDir(): Promise<string> {
  return invoke("get_data_dir");
}

export async function getAiSettings(): Promise<AiSettings> {
  return invoke("get_ai_settings");
}

export async function setAiSettings(input: AiSettingsInput): Promise<AiSettings> {
  return invoke("set_ai_settings", { input });
}
