import json
import logging

from anthropic import Anthropic

from app.domain.ai_client_interface import (
    IAIClient,
    MemoAnalysisResult,
    SearchResult,
)
from app.domain.models import Memo

logger = logging.getLogger(__name__)

ANALYZE_SYSTEM_PROMPT = (
    "あなたは優秀なメモ整理アシスタントです。"
    "入力されたテキストを要約し、関連するタグをJSON形式で出力してください。"
    '必ず以下の形式で返してください: {"summary": "要約文", "tags": ["tag1", "tag2"]}'
)

SEARCH_SYSTEM_PROMPT = (
    "あなたは優秀なメモ検索アシスタントです。"
    "ユーザーのメモ一覧と検索クエリが与えられます。"
    "クエリに文脈的に関連するメモを見つけ、回答を生成してください。"
    "必ず以下のJSON形式で返してください: "
    '{"answer": "回答文", "related_memo_ids": ["id1", "id2"]}'
)

MODEL = "claude-3-5-haiku-20241022"


class ClaudeClient(IAIClient):
    """Claude API implementation of IAIClient."""

    def __init__(self, api_key: str) -> None:
        self._client = Anthropic(api_key=api_key)

    def analyze_memo(self, content: str) -> MemoAnalysisResult:
        response = self._client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=ANALYZE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )

        raw_text = response.content[0].text
        parsed = json.loads(raw_text)

        return MemoAnalysisResult(
            summary=parsed["summary"],
            tags=parsed.get("tags", []),
        )

    @staticmethod
    def _format_memo(m: Memo) -> str:
        summary = m.summary or "未生成"
        tags = ", ".join(m.tags)
        return f"ID: {m.id}\n内容: {m.content}\n要約: {summary}\nタグ: {tags}"

    def search_memos(self, query: str, memos: list[Memo]) -> SearchResult:
        memo_texts = "\n---\n".join(self._format_memo(m) for m in memos)

        user_message = f"## メモ一覧\n{memo_texts}\n\n## 検索クエリ\n{query}"

        response = self._client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=SEARCH_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = response.content[0].text
        parsed = json.loads(raw_text)

        return SearchResult(
            answer=parsed["answer"],
            related_memo_ids=parsed.get("related_memo_ids", []),
        )
