import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphData } from "@/entities/graph";

const COLOR_MODE: ColorMode = "dark";

const NODE_COLORS = [
  { bg: "#1e3a5f", border: "rgba(96, 165, 250, 0.4)" },
  { bg: "#3b1f4e", border: "rgba(192, 132, 252, 0.4)" },
  { bg: "#1a3a2a", border: "rgba(74, 222, 128, 0.4)" },
  { bg: "#3d2b1a", border: "rgba(251, 191, 36, 0.4)" },
  { bg: "#3b1f2e", border: "rgba(251, 113, 133, 0.4)" },
  { bg: "#1a2f3d", border: "rgba(34, 211, 238, 0.4)" },
  { bg: "#2d2b1a", border: "rgba(163, 230, 53, 0.4)" },
  { bg: "#1e293b", border: "rgba(99, 102, 241, 0.4)" },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getNodeColor(tags: string[]) {
  const key = tags.length > 0 ? tags[0] : "";
  return NODE_COLORS[hashString(key) % NODE_COLORS.length];
}

function getNodeLabel(tags: string[], label: string): string {
  if (tags.length > 0) {
    return tags.slice(0, 2).join(" / ");
  }
  return label.length > 15 ? label.slice(0, 15) + "..." : label;
}

function getEdgeColor(similarity: number): string {
  if (similarity >= 0.9) return "rgba(199, 210, 254, 0.8)";
  if (similarity >= 0.7) return "rgba(129, 140, 248, 0.5)";
  return "rgba(99, 102, 241, 0.25)";
}

type GraphViewerProps = {
  graphData: GraphData;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onPaneClick: () => void;
};

export const GraphViewer = ({
  graphData,
  selectedNodeId,
  onNodeSelect,
  onPaneClick,
}: GraphViewerProps) => {
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of graphData.edges) {
      if (e.source === selectedNodeId) ids.add(e.target);
      if (e.target === selectedNodeId) ids.add(e.source);
    }
    return ids;
  }, [selectedNodeId, graphData.edges]);

  const { flowNodes, flowEdges } = useMemo(() => {
    const count = graphData.nodes.length;
    const radius = Math.max(200, count * 40);
    const centerX = 400;
    const centerY = 300;

    const nodes: Node[] = graphData.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / count;
      const color = getNodeColor(n.tags);
      const isSelected = n.id === selectedNodeId;
      const isConnected = connectedNodeIds.has(n.id);
      const isDimmed = selectedNodeId !== null && !isSelected && !isConnected;

      return {
        id: n.id,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        data: { label: getNodeLabel(n.tags, n.label) },
        style: {
          background: color.bg,
          color: "#ffffff",
          border: isSelected
            ? "2px solid rgba(129, 140, 248, 0.9)"
            : `1px solid ${color.border}`,
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "12px",
          fontWeight: 500,
          width: 120,
          textAlign: "center" as const,
          opacity: isDimmed ? 0.3 : 1,
          boxShadow: isSelected
            ? "0 0 16px rgba(99, 102, 241, 0.4)"
            : "none",
          transition: "opacity 0.2s, border 0.2s, box-shadow 0.2s",
        },
      };
    });

    const edges: Edge[] = graphData.edges.map((e, i) => {
      const isHighlighted =
        selectedNodeId !== null &&
        (e.source === selectedNodeId || e.target === selectedNodeId);
      const isDimmed = selectedNodeId !== null && !isHighlighted;

      return {
        id: `edge-${i}`,
        source: e.source,
        target: e.target,
        style: {
          stroke: isHighlighted
            ? "rgba(165, 180, 252, 0.8)"
            : getEdgeColor(e.similarity),
          strokeWidth: Math.max(1, e.similarity * 4),
          opacity: isDimmed ? 0.15 : 1,
          transition: "opacity 0.2s",
        },
        label: isHighlighted ? `${e.similarity.toFixed(2)}` : undefined,
        labelStyle: { fill: "rgba(255,255,255,0.6)", fontSize: 10 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
      };
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [graphData, selectedNodeId, connectedNodeIds]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodeClick={handleNodeClick}
      onPaneClick={onPaneClick}
      colorMode={COLOR_MODE}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="rgba(99, 102, 241, 0.08)" gap={24} />
      <Controls
        showInteractive={false}
        style={{ background: "#1e293b", borderColor: "rgba(99,102,241,0.3)" }}
      />
    </ReactFlow>
  );
};
