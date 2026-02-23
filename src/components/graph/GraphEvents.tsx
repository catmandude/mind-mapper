import { useEffect, useState } from "react";
import { useSigma, useRegisterEvents } from "@react-sigma/core";
import type { Item } from "../../types";

interface GraphEventsProps {
  items: Item[];
  onClickNode: (item: Item) => void;
}

export function GraphEvents({ items, onClickNode }: GraphEventsProps) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const itemMap = new Map(items.map((item) => [item.id, item]));

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => {
        const item = itemMap.get(node);
        if (item) onClickNode(item);
      },
      enterNode: ({ node }) => setHoveredNode(node),
      leaveNode: () => setHoveredNode(null),
    });
  }, [registerEvents, items, onClickNode]);

  // Highlight hovered node and its neighbors
  useEffect(() => {
    const graph = sigma.getGraph();

    if (hoveredNode) {
      const neighbors = new Set(graph.neighbors(hoveredNode));
      neighbors.add(hoveredNode);

      sigma.setSetting("nodeReducer", (node, data) => {
        if (neighbors.has(node)) {
          return { ...data, zIndex: 1 };
        }
        return { ...data, color: "#e0e0e0", zIndex: 0 };
      });

      sigma.setSetting("edgeReducer", (edge, data) => {
        const src = graph.source(edge);
        const tgt = graph.target(edge);
        if (neighbors.has(src) && neighbors.has(tgt)) {
          return { ...data, zIndex: 1 };
        }
        return { ...data, color: "rgba(200,200,200,0.1)", zIndex: 0 };
      });
    } else {
      sigma.setSetting("nodeReducer", null);
      sigma.setSetting("edgeReducer", null);
    }
  }, [hoveredNode, sigma]);

  return null;
}
