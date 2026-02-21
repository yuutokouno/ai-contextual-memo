import { useState, useRef, useEffect, useMemo } from "react";
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
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useCreateMemo } from "@/features/memo/create-memo";
import { useMemoList } from "@/features/memo/memo-list";
import { useSearchMemo } from "@/features/memo/search-memo";
import { useUpdateMemo } from "@/features/memo/update-memo";
import { useDeleteMemo } from "@/features/memo/delete-memo";
import type { Memo, SearchResult } from "@/entities/memo";

type MemoCardProps = {
  memo: Memo;
  isHighlighted: boolean;
  onTagClick: (tag: string) => void;
};

const MemoCard = ({ memo, isHighlighted, onTagClick }: MemoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memo.content);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateMemo = useUpdateMemo();
  const deleteMemo = useDeleteMemo();

  const title =
    memo.summary ||
    memo.content.slice(0, 60) + (memo.content.length > 60 ? "..." : "");

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setIsOpen(true);
    }
  }, [isHighlighted]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (!editContent.trim() || editContent === memo.content) {
      setIsEditing(false);
      setEditContent(memo.content);
      return;
    }
    updateMemo.mutate(
      { id: memo.id, content: editContent },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => {
    deleteMemo.mutate(memo.id, {
      onSuccess: () => setIsConfirmingDelete(false),
    });
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white/5 backdrop-blur-xl border rounded-[16px] transition-all ${
        isHighlighted
          ? "border-indigo-500/40 bg-indigo-500/5"
          : "border-white/8 hover:bg-white/[0.07]"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 p-4 text-left cursor-pointer"
      >
        <span className="text-white/40 shrink-0">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="text-[15px] font-medium text-white flex-1 break-words">
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
          {isEditing ? (
            <div>
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full resize-none rounded-[8px] bg-white/5 border border-white/10 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                rows={5}
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(memo.content);
                  }}
                  className="flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-xs text-white/50 hover:text-white/70 transition-colors cursor-pointer"
                >
                  <X size={12} />
                  キャンセル
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateMemo.isPending || !editContent.trim()}
                  className="flex items-center gap-1 rounded-[8px] bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {updateMemo.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  保存
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {memo.content}
              </p>

              {memo.summary && (
                <div className="mt-3 flex items-start gap-2">
                  <Sparkles
                    size={14}
                    className="text-indigo-400 mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-white/60 italic">{memo.summary}</p>
                </div>
              )}

              {memo.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {memo.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onTagClick(tag)}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs text-indigo-300 hover:bg-indigo-500/25 transition-colors cursor-pointer"
                    >
                      <Tag size={10} />
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <Clock size={12} />
                  {new Date(memo.created_at).toLocaleString("ja-JP")}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Pencil size={12} />
                    編集
                  </button>
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleDelete}
                        disabled={deleteMemo.isPending}
                        className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        {deleteMemo.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        削除する
                      </button>
                      <button
                        onClick={() => setIsConfirmingDelete(false)}
                        className="rounded-[8px] px-2 py-1 text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                      >
                        やめる
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                      削除
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
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
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { data: memos = [], isLoading } = useMemoList();
  const createMemo = useCreateMemo();
  const searchMemo = useSearchMemo();

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    memos.forEach((m) => m.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [memos]);

  const filteredMemos = useMemo(() => {
    if (!activeTag) return memos;
    return memos.filter((m) => m.tags.includes(activeTag));
  }, [memos, activeTag]);

  const highlightedIds = useMemo(
    () => new Set(searchResult?.related_memo_ids ?? []),
    [searchResult],
  );

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

  const handleTagClick = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  // Find related memos from search result
  const relatedMemos = useMemo(() => {
    if (!searchResult) return [];
    return searchResult.related_memo_ids
      .map((id) => memos.find((m) => m.id === id))
      .filter((m): m is Memo => m !== undefined);
  }, [searchResult, memos]);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">ACM</h1>
          <p className="mt-1 text-sm text-white/40">
            AI-powered contextual memos
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="AI でメモを検索..."
            className="w-full rounded-[12px] bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 transition-colors focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07]"
          />
          {searchMemo.isPending && (
            <Loader2
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin"
            />
          )}
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="mb-6 bg-indigo-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-[16px] p-4">
            <div className="flex items-start gap-2">
              <Sparkles
                size={16}
                className="text-indigo-400 mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 leading-relaxed">
                  {searchResult.answer}
                </p>

                {relatedMemos.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/40 mb-2">関連メモ:</p>
                    <div className="space-y-1">
                      {relatedMemos.map((memo) => (
                        <button
                          key={memo.id}
                          onClick={() => {
                            setActiveTag(null);
                            // Trigger re-render with highlight
                            setSearchResult({ ...searchResult });
                          }}
                          className="flex items-center gap-2 w-full text-left rounded-[8px] px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <FileText
                            size={12}
                            className="text-indigo-400 shrink-0"
                          />
                          <span className="text-xs text-white/70 truncate">
                            {memo.summary || memo.content.slice(0, 50)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
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

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                  activeTag === tag
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                }`}
              >
                <Tag size={10} />
                {tag}
              </button>
            ))}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer"
              >
                <X size={10} />
                クリア
              </button>
            )}
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
              <span>
                {activeTag
                  ? `${filteredMemos.length} / ${memos.length} メモ`
                  : `${memos.length} メモ`}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-white/30 animate-spin" />
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/20">
              <FileText size={32} strokeWidth={1} />
              <p className="mt-3 text-sm">
                {activeTag
                  ? `「${activeTag}」のメモはありません`
                  : "メモはまだありません"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMemos.map((memo) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  isHighlighted={highlightedIds.has(memo.id)}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
