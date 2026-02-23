import { useEffect } from "react";
import { SigmaContainer, useLoadGraph, useSigma } from "@react-sigma/core";
import { useLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import "@react-sigma/core/lib/style.css";
import type Graph from "graphology";
import type { Item } from "../../types";
import { useGraphData } from "../../hooks/useGraphData";
import { GraphEvents } from "./GraphEvents";
import { GraphLegend } from "./GraphLegend";

interface GraphViewProps {
  items: Item[];
  onClickNode: (item: Item) => void;
  height: string;
}

function GraphLoader({ graph }: { graph: Graph }) {
  const loadGraph = useLoadGraph();

  useEffect(() => {
    loadGraph(graph);
  }, [graph, loadGraph]);

  return null;
}

function LayoutApplier() {
  const sigma = useSigma();
  const { assign } = useLayoutForceAtlas2({
    iterations: 100,
    settings: {
      gravity: 1,
      scalingRatio: 10,
      barnesHutOptimize: true,
      slowDown: 5,
    },
  });

  useEffect(() => {
    // Wait for graph to be loaded, then apply layout
    const timer = setTimeout(() => {
      if (sigma.getGraph().order > 0) {
        assign();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [sigma, assign]);

  return null;
}

export function GraphView({ items, onClickNode, height }: GraphViewProps) {
  const graph = useGraphData(items);

  if (items.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#868e96" }}>
        No items to display
      </div>
    );
  }

  // Key on item IDs so SigmaContainer remounts when the set changes
  const graphKey = items.map((i) => i.id).sort().join(",");

  return (
    <div style={{ height, position: "relative" }}>
      <SigmaContainer
        key={graphKey}
        style={{ height: "100%", width: "100%" }}
        settings={{
          renderLabels: true,
          labelRenderedSizeThreshold: 8,
          labelDensity: 0.5,
          defaultEdgeType: "line",
          enableEdgeEvents: false,
        }}
      >
        <GraphLoader graph={graph} />
        <LayoutApplier />
        <GraphEvents items={items} onClickNode={onClickNode} />
      </SigmaContainer>
      <GraphLegend />
    </div>
  );
}
