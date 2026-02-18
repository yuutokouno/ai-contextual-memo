import json
import logging
import re

from anthropic import Anthropic

from app.domain.memo.entities.memo import Memo
from app.domain.memo.services.ai_client import (
    IAIClient,
    MemoAnalysisResult,
    SearchResult,
)

logger = logging.getLogger(__name__)

ANALYZE_SYSTEM_PROMPT = (
    "あなたは優秀なメモ整理アシスタントです。"
    "入力されたテキストを要約し、関連するタグをJSON形式で出力してください。"
    "JSONのみを返し、それ以外のテキストは含めないでください。"
    '形式: {"summary": "要約文", "tags": ["tag1", "tag2"]}'
)

SEARCH_SYSTEM_PROMPT = (
    "あなたは優秀なメモ検索アシスタントです。"
    "ユーザーのメモ一覧と検索クエリが与えられます。"
    "クエリに文脈的に関連するメモを見つけ、回答を生成してください。"
    "JSONのみを返し、それ以外のテキストは含めないでください。"
    '形式: {"answer": "回答文", "related_memo_ids": ["id1", "id2"]}'
)

MODEL = "claude-haiku-4-5-20251001"


def _extract_json(text: str) -> dict:  # type: ignore[type-arg]
    """Extract JSON object from text that may contain markdown fences."""
    # Try direct parse first
    try:
        return json.loads(text)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code block
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))  # type: ignore[no-any-return]

    # Try finding first { ... }
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))  # type: ignore[no-any-return]

    msg = f"No valid JSON found in response: {text[:200]}"
    raise ValueError(msg)


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
        parsed = _extract_json(raw_text)

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
        parsed = _extract_json(raw_text)

        return SearchResult(
            answer=parsed["answer"],
            related_memo_ids=parsed.get("related_memo_ids", []),
        )
