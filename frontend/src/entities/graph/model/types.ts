export type GraphNode = {
  id: string;
  label: string;
  content: string;
  tags: string[];
  created_at: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  similarity: number;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
