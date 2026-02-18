import { useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Tag,
  Clock,
  Sparkles,
  FileText,
  Loader2,
} from "lucide-react";
import { useCreateMemo } from "@/features/memo/create-memo";
import { useMemoList } from "@/features/memo/memo-list";
import { useSearchMemo } from "@/features/memo/search-memo";
import type { Memo, SearchResult } from "@/entities/memo";

const MemoCard = ({ memo }: { memo: Memo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const title = memo.summary || memo.content.slice(0, 60) + (memo.content.length > 60 ? "..." : "");

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/8 rounded-[16px] transition-colors hover:bg-white/[0.07]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 p-4 text-left cursor-pointer"
      >
        <span className="text-white/40 shrink-0">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="text-[15px] font-medium text-white truncate flex-1">
          {title}
        </span>
        {memo.tags.length > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-white/40 shrink-0">
            <Tag size={12} />
            {memo.tags.length}
          </span>
        )}
        <span className="text-xs text-white/30 shrink-0 tabular-nums">
          {new Date(memo.created_at).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {memo.content}
          </p>

          {memo.summary && (
            <div className="mt-3 flex items-start gap-2">
              <Sparkles size={14} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-sm text-white/60 italic">{memo.summary}</p>
            </div>
          )}

          {memo.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memo.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs text-indigo-300"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-xs text-white/30">
            <Clock size={12} />
            {new Date(memo.created_at).toLocaleString("ja-JP")}
          </div>
        </div>
      )}
    </div>
  );
};

export const MemoPage = () => {
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: memos = [], isLoading } = useMemoList();
  const createMemo = useCreateMemo();
  const searchMemo = useSearchMemo();

  const handleCreate = () => {
    if (!content.trim()) return;
    createMemo.mutate(content, {
      onSuccess: () => {
        setContent("");
        setIsCreateOpen(false);
      },
    });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchMemo.mutate(searchQuery, {
      onSuccess: (result) => setSearchResult(result),
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ACM
          </h1>
          <p className="mt-1 text-sm text-white/40">
            AI-powered contextual memos
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="AI でメモを検索..."
            className="w-full rounded-[12px] bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 transition-colors focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07]"
          />
          {searchMemo.isPending && (
            <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
          )}
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="mb-6 bg-indigo-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-[16px] p-4">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-white/80 leading-relaxed">
                  {searchResult.answer}
                </p>
                {searchResult.related_memo_ids.length > 0 && (
                  <p className="mt-2 text-xs text-white/40">
                    関連メモ: {searchResult.related_memo_ids.length}件
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSearchResult(null)}
              className="mt-3 text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Create Memo */}
        {!isCreateOpen ? (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mb-6 flex w-full items-center gap-2 rounded-[12px] bg-white/5 border border-white/10 border-dashed px-4 py-3 text-sm text-white/40 hover:text-white/60 hover:bg-white/[0.07] hover:border-white/15 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            メモを追加...
          </button>
        ) : (
          <div className="mb-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[16px] p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="メモを入力..."
              autoFocus
              className="w-full resize-none rounded-[8px] bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none leading-relaxed"
              rows={4}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setContent("");
                }}
                className="rounded-[8px] px-3 py-1.5 text-sm text-white/50 hover:text-white/70 transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={createMemo.isPending || !content.trim()}
                className="flex items-center gap-1.5 rounded-[8px] bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {createMemo.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                保存
              </button>
            </div>
          </div>
        )}

        {/* Memo List */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/40">
              <FileText size={14} />
              <span>{memos.length} メモ</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-white/30 animate-spin" />
            </div>
          ) : memos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/20">
              <FileText size={32} strokeWidth={1} />
              <p className="mt-3 text-sm">メモはまだありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memos.map((memo) => (
                <MemoCard key={memo.id} memo={memo} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
