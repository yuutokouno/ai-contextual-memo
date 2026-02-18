export type Memo = {
  id: string;
  content: string;
  summary: string | null;
  tags: string[];
  created_at: string;
};

export type SearchResult = {
  answer: string;
  related_memo_ids: string[];
};
