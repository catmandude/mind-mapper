import { useMemo } from "react";
import type { Item } from "../types";
import { buildGraph } from "../lib/graph-builder";

export function useGraphData(items: Item[]) {
  return useMemo(() => buildGraph(items), [items]);
}
