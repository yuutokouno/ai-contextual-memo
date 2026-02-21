export type GraphNode = {
  id: string;
  label: string;
  tags: string[];
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
