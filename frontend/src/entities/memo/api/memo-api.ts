import { apiClient } from "@/shared/api";
import type { Memo, SearchResult } from "@/entities/memo/model";

export const memoApi = {
  getAll: async (): Promise<Memo[]> => {
    const { data } = await apiClient.get<Memo[]>("/memos");
    return data;
  },

  create: async (content: string): Promise<Memo> => {
    const { data } = await apiClient.post<Memo>("/memos", { content });
    return data;
  },

  search: async (query: string): Promise<SearchResult> => {
    const { data } = await apiClient.post<SearchResult>("/memos/search", {
      query,
    });
    return data;
  },
};
