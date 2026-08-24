"""RAG helpers — index knowledge markdown into pgvector and retrieve."""
from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from .embeddings import embedding_service

logger = logging.getLogger(__name__)
KNOWLEDGE_DIR = Path(__file__).resolve().parents[1] / "knowledge"


def ensure_knowledge_indexed(db: Session, force: bool = False) -> int:
    if not embedding_service.available:
        return 0

    existing = db.execute(text("SELECT COUNT(*) FROM knowledge_chunks")).scalar() or 0
    if existing > 0 and not force:
        return int(existing)

    if force:
        db.execute(text("DELETE FROM knowledge_chunks"))
        db.commit()

    chunks: list[tuple[str, str]] = []
    if KNOWLEDGE_DIR.exists():
        for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
            text_body = path.read_text(encoding="utf-8")
            for block in _split_chunks(text_body):
                chunks.append((path.name, block))

    if not chunks:
        return 0

    vectors = embedding_service.embed_many(
        [c[1] for c in chunks], task_type="RETRIEVAL_DOCUMENT"
    )
    count = 0
    for (source, content), emb in zip(chunks, vectors):
        emb_literal = "[" + ",".join(str(float(x)) for x in emb) + "]"
        db.execute(
            text(
                """
                INSERT INTO knowledge_chunks (id, source, content, embedding, metadata)
                VALUES (:id, :source, :content, CAST(:embedding AS vector), CAST(:metadata AS jsonb))
                """
            ),
            {
                "id": str(uuid4()),
                "source": source,
                "content": content,
                "embedding": emb_literal,
                "metadata": "{}",
            },
        )
        count += 1
    db.commit()
    return count


def retrieve_chunks(db: Session, query: str, k: int = 4) -> list[dict]:
    if not embedding_service.available:
        # keyword fallback
        rows = db.execute(
            text(
                """
                SELECT source, content, 0.0 AS distance
                FROM knowledge_chunks
                WHERE content ILIKE :q
                LIMIT :k
                """
            ),
            {"q": f"%{query[:80]}%", "k": k},
        ).mappings().all()
        return [dict(r) for r in rows]

    emb = embedding_service.embed(query, task_type="RETRIEVAL_QUERY")
    emb_literal = "[" + ",".join(str(float(x)) for x in emb) + "]"
    rows = db.execute(
        text(
            """
            SELECT source, content, (embedding <=> CAST(:emb AS vector)) AS distance
            FROM knowledge_chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:emb AS vector)
            LIMIT :k
            """
        ),
        {"emb": emb_literal, "k": k},
    ).mappings().all()
    return [dict(r) for r in rows]


def _split_chunks(text_body: str, max_chars: int = 900) -> list[str]:
    paragraphs = [p.strip() for p in text_body.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for p in paragraphs:
        if len(current) + len(p) + 2 <= max_chars:
            current = f"{current}\n\n{p}".strip()
        else:
            if current:
                chunks.append(current)
            current = p
    if current:
        chunks.append(current)
    return chunks or [text_body[:max_chars]]
