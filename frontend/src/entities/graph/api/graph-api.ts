import { apiClient } from "@/shared/api";
import type { GraphData } from "@/entities/graph/model";

export const graphApi = {
  getGraph: async (): Promise<GraphData> => {
    const { data } = await apiClient.get<GraphData>("/memos/graph");
    return data;
  },
};
