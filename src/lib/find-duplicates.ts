import { listItems } from "./tauri-commands";
import { tokenize, overlapScore } from "./extract-keywords";
import type { Item } from "../types";

const SIMILARITY_THRESHOLD = 0.5;

/**
 * Find existing items that are similar to the given text.
 * Uses listItems (plain SQL) instead of FTS to avoid index corruption issues.
 * Compares keyword overlap — if half or more of the keywords match, it's a duplicate.
 */
export async function findDuplicates(
  text: string,
  excludeId?: string,
): Promise<Item[]> {
  const inputTokens = tokenize(text);
  if (inputTokens.size === 0) return [];

  const allItems = await listItems();

  return allItems.filter((item) => {
    if (excludeId && item.id === excludeId) return false;
    const itemText = `${item.title} ${item.content}`;
    const itemTokens = tokenize(itemText);
    return overlapScore(inputTokens, itemTokens) >= SIMILARITY_THRESHOLD;
  });
}
