import { useState, useCallback } from "react";
import { Loader2, FileText } from "lucide-react";
import { useGraphData } from "@/features/graph";
import { GraphViewer, NodeDetailPanel } from "@/widgets/graph";

export const GraphPage = () => {
  const { data: graphData, isLoading } = useGraphData();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode =
    graphData?.nodes.find((n) => n.id === selectedNodeId) ?? null;

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

  if (!graphData || graphData.nodes.length === 0) {
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
      <GraphViewer
        graphData={graphData}
        selectedNodeId={selectedNodeId}
        onNodeSelect={handleNodeSelect}
        onPaneClick={handlePaneClick}
      />

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          edges={graphData.edges}
          allNodes={graphData.nodes}
          onClose={() => setSelectedNodeId(null)}
          onNodeFocus={handleNodeSelect}
        />
      )}
    </div>
  );
};
