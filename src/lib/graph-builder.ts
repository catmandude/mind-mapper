import Graph from "graphology";
import type { Item } from "../types";
import { tokenize, overlapScore } from "./extract-keywords";

const TYPE_COLORS: Record<string, string> = {
  note: "#339af0",    // blue
  shell: "#40c057",   // green
  snippet: "#7950f2", // violet
  config: "#fd7e14",  // orange
};

const DEFAULT_COLOR = "#868e96"; // gray

/**
 * Build a graphology Graph from items.
 * Nodes are colored by type, sized by tag count.
 * Edges weighted by keyword overlap (60%) + shared tags (40%).
 */
export function buildGraph(items: Item[]): Graph {
  const graph = new Graph();

  // Pre-tokenize all items
  const tokenSets = new Map<string, Set<string>>();
  for (const item of items) {
    const text = `${item.title} ${item.description} ${item.content}`;
    tokenSets.set(item.id, tokenize(text));
  }

  // Add nodes
  for (const item of items) {
    const size = Math.min(5 + item.tags.length * 2, 15);
    graph.addNode(item.id, {
      label: item.title,
      size,
      color: TYPE_COLORS[item.type] ?? DEFAULT_COLOR,
      x: Math.random() * 100,
      y: Math.random() * 100,
      itemType: item.type,
    });
  }

  // Add edges
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      const tokensA = tokenSets.get(a.id)!;
      const tokensB = tokenSets.get(b.id)!;
      const kwOverlap = overlapScore(tokensA, tokensB);

      const tagsA = new Set(a.tags);
      let sharedTags = 0;
      for (const tag of b.tags) {
        if (tagsA.has(tag)) sharedTags++;
      }
      const tagScore = Math.min(sharedTags * 0.3, 1.0);

      const combined = Math.min(kwOverlap * 0.6 + tagScore * 0.4, 1.0);

      if (combined >= 0.15) {
        graph.addEdge(a.id, b.id, {
          weight: combined,
          size: 1 + combined * 4,
          color: `rgba(150, 150, 150, ${0.2 + combined * 0.6})`,
        });
      }
    }
  }

  return graph;
}

export { TYPE_COLORS };
