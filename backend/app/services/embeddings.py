"""Gemini embeddings for pgvector RAG."""
from __future__ import annotations

import logging
import math

from ..core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_EMBEDDING_MODEL
        self.dim = settings.EMBEDDING_DIM
        self._client = None

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if self._client is None:
            if not self.api_key:
                raise RuntimeError("GEMINI_API_KEY is not configured")
            from google import genai

            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def embed(self, text: str, *, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
        return self.embed_many([text], task_type=task_type)[0]

    def embed_many(
        self,
        texts: list[str],
        *,
        task_type: str = "RETRIEVAL_DOCUMENT",
    ) -> list[list[float]]:
        if not texts:
            return []

        from google.genai import types

        client = self._get_client()
        cleaned = [t.replace("\n", " ") for t in texts]
        response = client.models.embed_content(
            model=self.model,
            contents=cleaned,
            config=types.EmbedContentConfig(
                output_dimensionality=self.dim,
                task_type=task_type,
            ),
        )
        # gemini-embedding-001 requires manual normalization below 3072 dims.
        return [self._normalize(list(item.values)) for item in response.embeddings]

    @staticmethod
    def _normalize(vector: list[float]) -> list[float]:
        norm = math.sqrt(sum(v * v for v in vector))
        if norm == 0:
            return vector
        return [v / norm for v in vector]


embedding_service = EmbeddingService()
