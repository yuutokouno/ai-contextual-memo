import { useMemo } from "react";
import { X, Tag, Clock, Share2 } from "lucide-react";
import type { GraphNode, GraphEdge } from "@/entities/graph";

type RelatedNode = {
  node: GraphNode;
  similarity: number;
};

type NodeDetailPanelProps = {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onNodeFocus: (nodeId: string) => void;
};

export const NodeDetailPanel = ({
  node,
  edges,
  allNodes,
  onClose,
  onNodeFocus,
}: NodeDetailPanelProps) => {
  const relatedNodes = useMemo(() => {
    const related: RelatedNode[] = [];
    for (const edge of edges) {
      let targetId: string | null = null;
      if (edge.source === node.id) targetId = edge.target;
      if (edge.target === node.id) targetId = edge.source;
      if (targetId) {
        const targetNode = allNodes.find((n) => n.id === targetId);
        if (targetNode) {
          related.push({ node: targetNode, similarity: edge.similarity });
        }
      }
    }
    return related.sort((a, b) => b.similarity - a.similarity);
  }, [node.id, edges, allNodes]);

  return (
    <div className="absolute right-0 top-0 h-full w-80 border-l border-white/10 bg-[#0f172a]/95 backdrop-blur-xl overflow-y-auto animate-slide-in">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Memo Detail</h3>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Content</p>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">
              {node.content}
            </p>
          </div>

          {node.tags.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {node.tags.map((tag) => (
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
            <span>
              {new Date(node.created_at).toLocaleString("ja-JP")}
            </span>
          </div>

          {relatedNodes.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
                <Share2 size={10} />
                Related Nodes ({relatedNodes.length})
              </p>
              <div className="space-y-1.5">
                {relatedNodes.map(({ node: related, similarity }) => (
                  <button
                    key={related.id}
                    onClick={() => onNodeFocus(related.id)}
                    className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">
                        {related.tags.length > 0
                          ? related.tags.slice(0, 2).join(" / ")
                          : related.label}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/30 tabular-nums shrink-0">
                      {similarity.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
