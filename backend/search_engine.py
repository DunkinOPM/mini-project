"""
Local Search Engine
- Uses cosine similarity (no external vector DB)
- Searches transcript segments and slides
"""

from typing import List, Dict, Any
import numpy as np


class SearchEngine:
    def __init__(self, embedding_engine=None):
        self.ee = embedding_engine

    def search(
        self,
        query: str,
        transcript: List[Dict[str, Any]],
        slides: List[Dict[str, Any]],
        embeddings: Dict[str, Any],
    ) -> Dict[str, Any]:
        query_emb = None
        if self.ee:
            query_emb = self.ee.encode_single(query)

        slide_results = self._search_slides(query, query_emb, slides, embeddings)
        transcript_results = self._search_transcript(query, query_emb, transcript, embeddings)

        return {
            "query": query,
            "slides": slide_results,
            "transcript": transcript_results,
            "total": len(slide_results) + len(transcript_results),
        }

    def _search_slides(self, query, query_emb, slides, embeddings):
        results = []
        s_embs = np.array(embeddings.get("slides", []))

        for idx, slide in enumerate(slides):
            score = self._score(query, slide["text"], query_emb, s_embs, idx)
            if score > 0.2:
                results.append({
                    "id": slide["id"],
                    "type": "slide",
                    "title": slide["title"],
                    "text": slide["text"][:200],
                    "score": round(float(score), 3),
                    "relevance": self._label(score),
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:5]

    def _search_transcript(self, query, query_emb, transcript, embeddings):
        results = []
        t_embs = np.array(embeddings.get("transcript", []))

        for idx, seg in enumerate(transcript):
            score = self._score(query, seg["text"], query_emb, t_embs, idx)
            if score > 0.25:
                results.append({
                    "id": seg.get("id", idx),
                    "type": "transcript",
                    "timestamp": seg["timestamp"],
                    "start": seg.get("start", 0),
                    "text": seg["text"][:200],
                    "score": round(float(score), 3),
                    "relevance": self._label(score),
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:5]

    def _score(self, query: str, text: str, query_emb, matrix, idx: int) -> float:
        if query_emb is not None and self.ee and len(matrix) > 0 and idx < len(matrix):
            return self.ee.cosine_similarity(query_emb, matrix[idx])
        # Keyword fallback
        q_words = set(query.lower().split())
        t_words = set(text.lower().split())
        overlap = len(q_words & t_words)
        return overlap / max(len(q_words), 1) * 0.8

    @staticmethod
    def _label(score: float) -> str:
        if score >= 0.8:
            return "high"
        elif score >= 0.6:
            return "medium"
        return "low"
