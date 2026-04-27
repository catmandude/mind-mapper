import { useEffect, useMemo, useState } from "react";
import { useSigma, useRegisterEvents } from "@react-sigma/core";
import type { Item } from "../../types";

interface GraphEventsProps {
  items: Item[];
  onClickNode: (item: Item) => void;
}

interface TooltipPos {
  nodeId: string;
  x: number;
  y: number;
  size: number;
}

export function GraphEvents({ items, onClickNode }: GraphEventsProps) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);

  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => {
        setFocusedNode(node);
        const item = itemMap.get(node);
        if (item) onClickNode(item);
      },
      clickStage: () => setFocusedNode(null),
      enterNode: ({ node }) => setHoveredNode(node),
      leaveNode: () => setHoveredNode(null),
    });
  }, [registerEvents, itemMap, onClickNode]);

  // Position the tooltip above the hovered node, repositioning on camera moves
  useEffect(() => {
    if (!hoveredNode) {
      setTooltipPos(null);
      return;
    }

    const update = () => {
      const graph = sigma.getGraph();
      if (!graph.hasNode(hoveredNode)) return;
      const display = sigma.getNodeDisplayData(hoveredNode);
      if (!display) return;
      const viewport = sigma.framedGraphToViewport(display);
      setTooltipPos({
        nodeId: hoveredNode,
        x: viewport.x,
        y: viewport.y,
        size: display.size,
      });
    };

    update();
    sigma.on("afterRender", update);
    return () => {
      sigma.off("afterRender", update);
    };
  }, [hoveredNode, sigma]);

  // Apply fade/highlight reducers based on focused (sticky) or hovered (transient) node
  useEffect(() => {
    const graph = sigma.getGraph();
    const activeNode = focusedNode ?? hoveredNode;

    if (activeNode && graph.hasNode(activeNode)) {
      const neighbors = new Set(graph.neighbors(activeNode));
      neighbors.add(activeNode);

      sigma.setSetting("nodeReducer", (node, data) => {
        if (node === activeNode) {
          return { ...data, zIndex: 2, highlighted: true };
        }
        if (neighbors.has(node)) {
          return { ...data, zIndex: 1 };
        }
        return { ...data, color: "#2a2a35", label: "", zIndex: 0 };
      });

      sigma.setSetting("edgeReducer", (edge, data) => {
        const src = graph.source(edge);
        const tgt = graph.target(edge);
        if (neighbors.has(src) && neighbors.has(tgt)) {
          return { ...data, zIndex: 1 };
        }
        return { ...data, hidden: true };
      });
    } else {
      sigma.setSetting("nodeReducer", null);
      sigma.setSetting("edgeReducer", null);
    }
    sigma.refresh();
  }, [hoveredNode, focusedNode, sigma]);

  const tooltipItem = tooltipPos ? itemMap.get(tooltipPos.nodeId) : null;
  if (!tooltipPos || !tooltipItem) return null;

  const description = tooltipItem.description.trim();
  const truncated = description.length > 140 ? description.slice(0, 140) + "…" : description;

  return (
    <div
      style={{
        position: "absolute",
        left: tooltipPos.x,
        top: tooltipPos.y - tooltipPos.size - 8,
        transform: "translate(-50%, -100%)",
        background: "rgba(20, 20, 28, 0.96)",
        border: "1px solid rgba(139, 92, 246, 0.4)",
        borderRadius: 6,
        padding: "8px 10px",
        maxWidth: 280,
        pointerEvents: "none",
        zIndex: 100,
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
        {tooltipItem.title}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#a78bfa",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: description ? 6 : 0,
        }}
      >
        {tooltipItem.type}
      </div>
      {truncated && (
        <div style={{ fontSize: 12, color: "#c1c2c5", lineHeight: 1.4 }}>{truncated}</div>
      )}
      {tooltipItem.tags.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {tooltipItem.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10,
                background: "rgba(139, 92, 246, 0.2)",
                color: "#c4b5fd",
                padding: "1px 6px",
                borderRadius: 3,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
