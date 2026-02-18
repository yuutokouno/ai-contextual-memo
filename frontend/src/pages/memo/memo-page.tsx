import { useState } from "react";
import { useCreateMemo } from "@/features/memo/create-memo";
import { useMemoList } from "@/features/memo/memo-list";
import { useSearchMemo } from "@/features/memo/search-memo";
import type { SearchResult } from "@/entities/memo";

export const MemoPage = () => {
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const { data: memos = [], isLoading } = useMemoList();
  const createMemo = useCreateMemo();
  const searchMemo = useSearchMemo();

  const handleCreate = () => {
    if (!content.trim()) return;
    createMemo.mutate(content, {
      onSuccess: () => setContent(""),
    });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchMemo.mutate(searchQuery, {
      onSuccess: (result) => setSearchResult(result),
    });
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        AI Contextual Memo
      </h1>

      {/* Create Memo */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">New Memo</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your memo here..."
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          rows={4}
        />
        <button
          onClick={handleCreate}
          disabled={createMemo.isPending || !content.trim()}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createMemo.isPending ? "Creating..." : "Create Memo"}
        </button>
      </section>

      {/* Search */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">
          AI Search
        </h2>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search your memos with AI..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searchMemo.isPending || !searchQuery.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {searchMemo.isPending ? "Searching..." : "Search"}
          </button>
        </div>
        {searchResult && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-gray-800">{searchResult.answer}</p>
            {searchResult.related_memo_ids.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Related memos: {searchResult.related_memo_ids.length}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Memo List */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Memos</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : memos.length === 0 ? (
          <p className="text-sm text-gray-500">No memos yet.</p>
        ) : (
          <div className="space-y-3">
            {memos.map((memo) => (
              <div
                key={memo.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm text-gray-800">{memo.content}</p>
                {memo.summary && (
                  <p className="mt-2 text-xs text-gray-500 italic">
                    {memo.summary}
                  </p>
                )}
                {memo.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {memo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(memo.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
