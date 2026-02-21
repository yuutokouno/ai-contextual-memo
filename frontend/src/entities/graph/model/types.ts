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

export type Position3D = {
  x: number;
  y: number;
  z: number;
};

export type Graph3DNode = {
  id: string;
  label: string;
  content: string;
  tags: string[];
  created_at: string;
  position: Position3D;
};

export type Graph3DData = {
  nodes: Graph3DNode[];
  edges: GraphEdge[];
};
