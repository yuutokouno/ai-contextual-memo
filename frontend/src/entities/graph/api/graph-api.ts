import { apiClient } from "@/shared/api";
import type { GraphData, Graph3DData } from "@/entities/graph/model";

export const graphApi = {
  getGraph: async (): Promise<GraphData> => {
    const { data } = await apiClient.get<GraphData>("/memos/graph");
    return data;
  },
  getGraph3D: async (): Promise<Graph3DData> => {
    const { data } = await apiClient.get<Graph3DData>("/memos/graph/3d");
    return data;
  },
};
