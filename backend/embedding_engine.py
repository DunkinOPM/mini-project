"""
Embedding Engine
- Uses Sentence Transformers (all-MiniLM-L6-v2) locally
- Falls back to TF-IDF if not installed
- Falls back to simple keyword overlap if sklearn missing too
"""

from typing import List, Dict, Any
import numpy as np


class EmbeddingEngine:
    MODEL_NAME = "all-MiniLM-L6-v2"

    def __init__(self):
        self.model = None
        self.mode = "keyword"  # fallback
        self._load_model()

    def _load_model(self):
        # Try Sentence Transformers
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.MODEL_NAME)
            self.mode = "transformer"
            print(f"[EmbeddingEngine] Loaded: {self.MODEL_NAME}")
            return
        except Exception as e:
            print(f"[EmbeddingEngine] Sentence Transformers unavailable: {e}")

        # Try TF-IDF
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.mode = "tfidf"
            print("[EmbeddingEngine] Using TF-IDF fallback")
            return
        except Exception:
            pass

        print("[EmbeddingEngine] Using keyword overlap fallback")
        self.mode = "keyword"

    def encode(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 64))

        if self.mode == "transformer":
            return self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        elif self.mode == "tfidf":
            return self._tfidf_encode(texts)
        else:
            return self._keyword_encode(texts)

    def encode_single(self, text: str) -> np.ndarray:
        result = self.encode([text])
        return result[0] if len(result) > 0 else np.zeros(64)

    def _tfidf_encode(self, texts: List[str]) -> np.ndarray:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            vectorizer = TfidfVectorizer(max_features=128, stop_words="english")
            matrix = vectorizer.fit_transform(texts).toarray()
            norms = np.linalg.norm(matrix, axis=1, keepdims=True)
            norms[norms == 0] = 1
            return (matrix / norms).astype(np.float32)
        except Exception:
            return self._keyword_encode(texts)

    def _keyword_encode(self, texts: List[str]) -> np.ndarray:
        """Simple bag-of-words with fixed 64-dim hash trick."""
        DIM = 64
        result = []
        for text in texts:
            vec = np.zeros(DIM, dtype=np.float32)
            words = text.lower().split()
            for w in words:
                idx = hash(w) % DIM
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec /= norm
            result.append(vec)
        return np.array(result)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        a = a.flatten().astype(np.float32)
        b = b.flatten().astype(np.float32)
        # Align dimensions
        if len(a) != len(b):
            min_len = min(len(a), len(b))
            a, b = a[:min_len], b[:min_len]
        na, nb = np.linalg.norm(a), np.linalg.norm(b)
        if na == 0 or nb == 0:
            return 0.0
        return float(np.dot(a, b) / (na * nb))

    def batch_cosine_similarity(self, query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
        query = query.flatten().astype(np.float32)
        matrix = matrix.astype(np.float32)
        # Align dimensions
        q_dim = len(query)
        m_dim = matrix.shape[1] if matrix.ndim > 1 else len(query)
        if q_dim != m_dim:
            min_dim = min(q_dim, m_dim)
            query = query[:min_dim]
            matrix = matrix[:, :min_dim]
        norm_q = np.linalg.norm(query)
        if norm_q == 0:
            return np.zeros(len(matrix))
        norms = np.linalg.norm(matrix, axis=1)
        norms[norms == 0] = 1
        return matrix.dot(query) / (norms * norm_q)

    def compute_all(
        self,
        transcript: List[Dict[str, Any]],
        slides: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        print(f"[EmbeddingEngine] Computing embeddings (mode={self.mode})...")

        transcript_texts = [seg.get("text", "") for seg in transcript]
        slide_texts = [slide.get("text", "") for slide in slides]

        t_embs = self.encode(transcript_texts) if transcript_texts else np.zeros((0, 64))
        s_embs = self.encode(slide_texts) if slide_texts else np.zeros((0, 64))

        print(f"[EmbeddingEngine] Done. transcript={t_embs.shape}, slides={s_embs.shape}")

        return {
            "transcript": t_embs.tolist(),
            "slides": s_embs.tolist(),
        }
