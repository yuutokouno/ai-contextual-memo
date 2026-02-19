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

  update: async (id: string, content: string): Promise<Memo> => {
    const { data } = await apiClient.patch<Memo>(`/memos/${id}`, { content });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/memos/${id}`);
  },

  search: async (query: string): Promise<SearchResult> => {
    const { data } = await apiClient.post<SearchResult>("/memos/search", {
      query,
    });
    return data;
  },
};
