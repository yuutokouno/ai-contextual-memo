import { useState, useCallback, useMemo } from "react";
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
import { Loader2, X, Tag, Clock, FileText } from "lucide-react";
import { useGraphData } from "@/features/graph";
import type { GraphNode } from "@/entities/graph";

const COLOR_MODE: ColorMode = "dark";

type SelectedNode = GraphNode & { position: { x: number; y: number } };

const nodeStyle = {
  background: "#1e293b",
  color: "#ffffff",
  border: "1px solid rgba(99, 102, 241, 0.3)",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 500,
};

export const GraphPage = () => {
  const { data: graphData, isLoading } = useGraphData();
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) {
      return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };
    }

    const count = graphData.nodes.length;
    const radius = Math.max(200, count * 40);
    const centerX = 400;
    const centerY = 300;

    const nodes: Node[] = graphData.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / count;
      return {
        id: n.id,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        data: { label: n.label, tags: n.tags },
        style: nodeStyle,
      };
    });

    const edges: Edge[] = graphData.edges.map((e, i) => ({
      id: `edge-${i}`,
      source: e.source,
      target: e.target,
      style: {
        stroke: "rgba(99, 102, 241, 0.5)",
        strokeWidth: Math.max(1, e.similarity * 4),
      },
      label: e.similarity.toFixed(2),
      labelStyle: { fill: "rgba(255,255,255,0.4)", fontSize: 10 },
      labelBgStyle: { fill: "#0f172a", fillOpacity: 0.8 },
    }));

    return { flowNodes: nodes, flowEdges: edges };
  }, [graphData]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const graphNode = graphData?.nodes.find((n) => n.id === node.id);
      if (graphNode) {
        setSelectedNode({ ...graphNode, position: node.position });
      }
    },
    [graphData],
  );

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
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodeClick={onNodeClick}
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

      {selectedNode && (
        <div className="absolute right-0 top-0 h-full w-80 border-l border-white/10 bg-[#0f172a]/95 backdrop-blur-xl p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Memo Detail</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-white/40 mb-1">Content</p>
              <p className="text-sm text-white/80 leading-relaxed">
                {selectedNode.label}
              </p>
            </div>

            {selectedNode.tags.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs text-indigo-300"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Clock size={12} />
              <span>Node ID: {selectedNode.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
