"""
Alignment Engine
================

Production-ready module for linking video transcript segments to document pages/slides.

Pipeline:
1. Video processing: Extract transcript with timestamps (Whisper)
2. Document processing: Extract text from PDF/PPT
3. Embedding: Generate embeddings using sentence-transformers
4. Retrieval: Get top-K candidates using cosine similarity
5. Refinement: Use Gemini LLM API to validate and explain matches
"""

import json
from typing import Any, Dict, List

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from llm_engine import match_segment_to_document
from video_processor import VideoProcessor
from document_processor import DocumentProcessor


EMBEDDING_MODEL = "all-MiniLM-L6-v2"

class EmbeddingEngine:
    """
    Manages embedding generation and similarity computation.
    Uses sentence-transformers for semantic embeddings.
    """

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self.model_name = model_name
        self.model = None

    def load_model(self) -> "EmbeddingEngine":
        """Load the embedding model."""
        self.model = SentenceTransformer(self.model_name)
        return self

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to embeddings."""
        if self.model is None:
            self.load_model()
        if isinstance(texts, str):
            texts = [texts]
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return np.asarray(embeddings, dtype=np.float32)

    @staticmethod
    def cosine_similarity(query: np.ndarray, candidates: np.ndarray) -> np.ndarray:
        """Compute cosine similarity between query and candidates."""
        return cosine_similarity([query], candidates)[0]


def get_top_k_matches(
    segment_text: str,
    documents: List[Dict[str, Any]],
    embeddings_engine: EmbeddingEngine,
    doc_embeddings: np.ndarray,
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Retrieve top-K documents most similar to the segment.
    
    Args:
        segment_text: Video transcript segment
        documents: List of document objects (slides/pages)
        embeddings_engine: Initialized embedding engine
        doc_embeddings: Precomputed document embeddings
        top_k: Number of top candidates to retrieve
    
    Returns:
        Sorted list of top-K candidates with scores
    """
    segment_embedding = embeddings_engine.encode([segment_text])[0]
    similarities = embeddings_engine.cosine_similarity(segment_embedding, doc_embeddings)
    ranked = [
        {**documents[idx], "similarity_score": float(similarities[idx])}
        for idx in range(len(documents))
    ]
    ranked.sort(key=lambda x: x["similarity_score"], reverse=True)
    return ranked[:top_k]


def link_segments_to_documents(
    video_segments: List[Dict[str, Any]],
    documents: List[Dict[str, Any]],
    use_llm: bool = True,
) -> List[Dict[str, Any]]:
    """
    Link each video segment to the best matching document page/slide.
    
    Args:
        video_segments: List of transcript segments with timestamp and text
        documents: List of document objects (slides/pages)
        use_llm: Whether to use Gemini LLM for refinement (default: True)
    
    Returns:
        List of alignment records with timestamp, segment text, and match info
    """
    if not video_segments or not documents:
        return []
    
    # Initialize embedding engine
    print("[AlignmentEngine] Loading embedding model...")
    engine = EmbeddingEngine()
    engine.load_model()
    
    results = []
    
    doc_texts = [doc.get("text", "") for doc in documents]
    doc_embeddings = engine.encode(doc_texts) if doc_texts else np.zeros((0, 64), dtype=np.float32)
    
    # Chunk segments to avoid hitting API rate limits and clustering the UI
    chunk_size = 100
    chunked_segments = [video_segments[i:i+chunk_size] for i in range(0, len(video_segments), chunk_size)]
    
    import time
    for idx, chunk in enumerate(chunked_segments):
        print(f"[AlignmentEngine] Processing chunk {idx + 1}/{len(chunked_segments)}")
        
        segment_text = " ".join([s.get("text", "") for s in chunk])
        if not segment_text:
            continue
        
        # We will map the annotation to the middle segment of the chunk
        mid_idx = len(chunk) // 2
        target_seg = chunk[mid_idx]
        segment_id = target_seg.get("segment_id", target_seg.get("id", idx))
        
        # Retrieve top candidates using embeddings
        candidates = get_top_k_matches(segment_text, documents, engine, doc_embeddings, top_k=3)
        
        # Use LLM for final decision
        if use_llm:
            try:
                match = match_segment_to_document(segment_text, candidates)
                time.sleep(4) # Sleep 4s to avoid 15 RPM rate limit
            except Exception as e:
                # Fallback to best candidate
                best = candidates[0] if candidates else {"type": "unknown", "id": 0}
                match = {
                    "type": best.get("type", "unknown"),
                    "id": best.get("id", 0),
                    "reason": f"LLM unavailable, using best candidate: {str(e)}",
                }
        else:
            # Use best candidate from embeddings
            best = candidates[0] if candidates else {"type": "unknown", "id": 0}
            match = {
                "type": best.get("type", "unknown"),
                "id": best.get("id", 0),
                "reason": f"Best match by similarity score: {best.get('similarity_score', 0):.3f}",
            }
        
        target_slide_id = match.get("id", 0)
        target_slide_title = ""
        for doc in documents:
            if doc.get("id") == target_slide_id:
                target_slide_title = doc.get("title", "")
                break
        
        results.append({
            "segment_id": segment_id,
            "timestamp": target_seg.get("timestamp", ""),
            "start": chunk[0].get("start", 0.0),
            "end": chunk[-1].get("end", 0.0),
            "text": segment_text,
            "video_text": segment_text,
            "match": match,
            "slide_id": target_slide_id,
            "slide_title": target_slide_title,
            "concept": match.get("type", "Unknown"),
            "confidence": match.get("confidence", 0.0) if use_llm else best.get("similarity_score", 0.0),
        })
    
    return results


def process_video_and_document(
    video_path: str,
    document_path: str,
    use_llm: bool = True,
) -> List[Dict[str, Any]]:
    """
    End-to-end pipeline: video → transcript, document → text, then link.
    
    Args:
        video_path: Path to video file
        document_path: Path to PDF or PPT file
        use_llm: Whether to use Gemini for refinement
    
    Returns:
        List of alignment records
    """
    # Extract video transcript
    print(f"[AlignmentEngine] Extracting transcript from: {video_path}")
    video_processor = VideoProcessor()
    video_segments = video_processor.process(video_path)
    
    # Extract document text
    print(f"[AlignmentEngine] Extracting content from: {document_path}")
    doc_processor = DocumentProcessor()
    documents = doc_processor.process(document_path)
    
    # Link segments to documents
    print("[AlignmentEngine] Linking segments to documents...")
    alignments = link_segments_to_documents(video_segments, documents, use_llm=use_llm)
    
    return alignments


def main() -> None:
    """
    Demo: Run full pipeline with sample data.
    """
    # Sample video segments
    sample_video_segments = [
        {"timestamp": "02:30", "text": "dynamic programming avoids recomputation"},
        {"timestamp": "05:10", "text": "memoization stores computed values to speed up future queries"},
        {"timestamp": "08:45", "text": "greedy algorithms make locally optimal choices at each step"},
    ]
    
    # Sample documents (slides/pages)
    sample_documents = [
        {
            "type": "slide",
            "id": 5,
            "text": "Dynamic programming is an optimization technique that breaks down problems into overlapping subproblems",
        },
        {
            "type": "pdf",
            "id": 3,
            "text": "Memoization stores computed values in a cache to avoid redundant calculations",
        },
        {
            "type": "slide",
            "id": 7,
            "text": "Greedy algorithms make locally optimal choices at each step hoping to find a global optimum",
        },
    ]
    
    print("=" * 70)
    print("ALIGNMENT ENGINE - DEMO")
    print("=" * 70)
    
    try:
        # Link segments
        alignments = link_segments_to_documents(sample_video_segments, sample_documents, use_llm=True)
        
        # Print results
        print("\n" + "=" * 70)
        print("RESULTS")
        print("=" * 70)
        print(json.dumps(alignments, indent=2, ensure_ascii=False))
        
    except RuntimeError as e:
        print(f"\n❌ Error: {e}")
        print("\nTrying without LLM (embedding-only mode)...")
        
        # Fallback to embedding-only
        alignments = link_segments_to_documents(sample_video_segments, sample_documents, use_llm=False)
        print("\n" + "=" * 70)
        print("RESULTS (Embedding-Only)")
        print("=" * 70)
        print(json.dumps(alignments, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

    main()
