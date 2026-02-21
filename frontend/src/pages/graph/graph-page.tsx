import { useState, useCallback, useMemo } from "react";
import { Loader2, FileText } from "lucide-react";
import { useGraphData, useGraph3DData } from "@/features/graph";
import {
  GraphViewer,
  Graph3DViewer,
  NodeDetailPanel,
  ViewToggle,
} from "@/widgets/graph";
import type { GraphNode, Graph3DNode } from "@/entities/graph";

type ViewMode = "2d" | "3d";

export const GraphPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const { data: graphData, isLoading: isLoading2D } = useGraphData();
  const { data: graph3DData, isLoading: isLoading3D } = useGraph3DData();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const isLoading = viewMode === "2d" ? isLoading2D : isLoading3D;
  const hasData =
    viewMode === "2d"
      ? graphData && graphData.nodes.length > 0
      : graph3DData && graph3DData.nodes.length > 0;

  // Convert 3D nodes to GraphNode for NodeDetailPanel
  const panelNodes: GraphNode[] = useMemo(() => {
    if (viewMode === "2d" && graphData) return graphData.nodes;
    if (viewMode === "3d" && graph3DData) {
      return graph3DData.nodes.map((n: Graph3DNode) => ({
        id: n.id,
        label: n.label,
        content: n.content,
        tags: n.tags,
        created_at: n.created_at,
      }));
    }
    return [];
  }, [viewMode, graphData, graph3DData]);

  const panelEdges = useMemo(() => {
    if (viewMode === "2d" && graphData) return graphData.edges;
    if (viewMode === "3d" && graph3DData) return graph3DData.edges;
    return [];
  }, [viewMode, graphData, graph3DData]);

  const selectedNode =
    panelNodes.find((n) => n.id === selectedNodeId) ?? null;

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white/20">
        <FileText size={48} strokeWidth={1} />
        <p className="mt-4 text-sm">
          メモを追加してナレッジグラフを構築しましょう
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ViewToggle mode={viewMode} onModeChange={setViewMode} />

      {viewMode === "2d" && graphData && (
        <GraphViewer
          graphData={graphData}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          onPaneClick={handlePaneClick}
        />
      )}

      {viewMode === "3d" && graph3DData && (
        <Graph3DViewer
          graphData={graph3DData}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          onPaneClick={handlePaneClick}
        />
      )}

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          edges={panelEdges}
          allNodes={panelNodes}
          onClose={() => setSelectedNodeId(null)}
          onNodeFocus={handleNodeSelect}
        />
      )}
    </div>
  );
};
