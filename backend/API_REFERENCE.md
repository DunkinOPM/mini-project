# Alignment Engine - Complete API Reference

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Video Input (.mp4)  ──→  [VideoProcessor]                 │
│                            ↓ Extract Transcript            │
│                      [Video Segments + Timestamps]          │
│                            ↓                                │
│                    ┌───────────────────────┐                │
│                    │ Embedding Engine      │                │
│                    │ (all-MiniLM-L6-v2)    │                │
│                    │                       │                │
│  Document Input    │ • Load model          │                │
│  (.pdf/.pptx) ──→  │ • Encode texts        │                │
│  ↓                 │ • Compute cosine      │                │
│  [DocumentProcessor]│   similarity          │                │
│  ↓                 └───────────────────────┘                │
│  [Document Chunks]          ↓                               │
│                    Get Top-3 Candidates (by similarity)     │
│                            ↓                                │
│                    [Ollama LLM Engine]                      │
│                    • Validate selection                     │
│                    • Generate reasoning                     │
│                            ↓                                │
│            [Final Alignments with Explanations]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Module API Reference

### alignment_engine.py

#### class EmbeddingEngine

```python
class EmbeddingEngine:
    """Manages embedding generation and similarity computation."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2")
    def load_model(self) -> "EmbeddingEngine"
    def encode(self, texts: List[str]) -> np.ndarray
    def cosine_similarity(query: np.ndarray, candidates: np.ndarray) -> np.ndarray
```

**Example:**

```python
from alignment_engine import EmbeddingEngine

engine = EmbeddingEngine()
engine.load_model()

texts = ["Machine learning", "Deep learning"]
embeddings = engine.encode(texts)  # Returns (2, 384) array

query = engine.encode(["Neural networks"])[0]
scores = engine.cosine_similarity(query, embeddings)
# scores = [0.85, 0.92]
```

#### get_top_k_matches()

```python
def get_top_k_matches(
    segment_text: str,
    documents: List[Dict[str, Any]],
    embeddings_engine: EmbeddingEngine,
    top_k: int = 3,
) -> List[Dict[str, Any]]
```

Retrieves top-K documents most similar to a video segment.

**Args:**

- `segment_text` (str): Video transcript segment
- `documents` (List[Dict]): Document list with "type", "id", "text" keys
- `embeddings_engine` (EmbeddingEngine): Initialized engine
- `top_k` (int): Number of candidates (default: 3)

**Returns:**
List of documents sorted by similarity score.

**Example:**

```python
from alignment_engine import get_top_k_matches

candidates = get_top_k_matches(
    "Dynamic programming is a technique",
    documents,
    engine,
    top_k=3
)
# Returns top 3 docs with "similarity_score" added
```

#### link_segments_to_documents()

```python
def link_segments_to_documents(
    video_segments: List[Dict[str, Any]],
    documents: List[Dict[str, Any]],
    use_llm: bool = True,
) -> List[Dict[str, Any]]
```

**Main linking pipeline.** Links video segments to best matching documents.

**Args:**

- `video_segments` (List[Dict]): Segments with "timestamp" and "text"
- `documents` (List[Dict]): Documents with "type", "id", "text"
- `use_llm` (bool): Use Ollama for refinement (default: True)

**Returns:**

```python
[
  {
    "timestamp": "02:30",
    "video_text": "...",
    "match": {
      "type": "slide",
      "id": 5,
      "reason": "..."
    }
  }
]
```

**Example:**

```python
from alignment_engine import link_segments_to_documents

segments = [
    {"timestamp": "00:10", "text": "Introduction to machine learning"},
    {"timestamp": "01:30", "text": "Supervised learning methods"}
]

docs = [
    {"type": "slide", "id": 1, "text": "ML Overview"},
    {"type": "slide", "id": 2, "text": "Supervised Learning Techniques"}
]

results = link_segments_to_documents(segments, docs, use_llm=True)
```

#### process_video_and_document()

```python
def process_video_and_document(
    video_path: str,
    document_path: str,
    use_llm: bool = True,
) -> List[Dict[str, Any]]
```

**End-to-end pipeline.** Processes video and document files directly.

**Args:**

- `video_path` (str): Path to .mp4 file
- `document_path` (str): Path to .pdf or .pptx file
- `use_llm` (bool): Use Ollama for refinement

**Returns:**
Alignment results (same format as `link_segments_to_documents()`)

**Example:**

```python
from alignment_engine import process_video_and_document

results = process_video_and_document(
    "lecture.mp4",
    "slides.pptx",
    use_llm=True
)
```

---

### llm_engine.py

#### check_ollama_ready()

```python
def check_ollama_ready() -> bool
```

Verifies Ollama is running and accessible.

**Raises:**
`RuntimeError` if Ollama not available at http://127.0.0.1:11434

**Example:**

```python
from llm_engine import check_ollama_ready

try:
    check_ollama_ready()
    print("Ollama is ready")
except RuntimeError as e:
    print(f"Error: {e}")
```

#### match_segment_to_document()

```python
def match_segment_to_document(
    segment_text: str,
    candidates: List[Dict[str, Any]],
) -> Dict[str, Any]
```

Uses Ollama to match a segment to best candidate.

**Args:**

- `segment_text` (str): Video segment
- `candidates` (List[Dict]): Top-K candidates with "type", "id", "text"

**Returns:**

```python
{
  "type": "slide",
  "id": 5,
  "reason": "Directly explains the concept"
}
```

**Validation:**

- Returned ID must be in candidates
- Type must be "slide" or "pdf"
- Reason must not be empty

**Example:**

```python
from llm_engine import match_segment_to_document

candidates = [
    {"type": "slide", "id": 5, "text": "Dynamic programming..."},
    {"type": "slide", "id": 7, "text": "Greedy algorithms..."}
]

match = match_segment_to_document(
    "The technique avoids recomputation",
    candidates
)
```

#### build_matching_prompt()

```python
def build_matching_prompt(
    segment_text: str,
    candidates: List[Dict[str, Any]],
) -> str
```

Constructs the prompt sent to Ollama.

**Returns:**
Formatted prompt string with strict JSON formatting instructions.

---

### video_processor.py (Enhanced)

#### VideoProcessor.process()

```python
def process(video_path: str) -> List[Dict[str, Any]]
```

Extracts transcript with timestamps from video.

**Returns:**

```python
[
  {
    "id": 0,
    "timestamp": "00:05",
    "start": 5.2,
    "end": 10.5,
    "text": "Introduction to the topic"
  },
  ...
]
```

**Fallback:**
If Whisper/ffmpeg unavailable, generates mock transcript scaled to video duration.

---

### document_processor.py (Enhanced)

#### DocumentProcessor.process()

```python
def process(doc_path: str) -> List[Dict[str, Any]]
```

Extracts content from PDF or PPT.

**Returns:**

```python
[
  {
    "id": 0,
    "slide_number": 1,
    "type": "slide",
    "title": "Slide Title",
    "bullets": ["point 1", "point 2"],
    "text": "Full slide text"
  },
  ...
]
```

**Supported Formats:**

- .pptx (PowerPoint)
- .pdf (PDF Documents)

---

## Data Structures

### Video Segment

```python
{
    "timestamp": "00:05:30",  # HH:MM:SS format
    "text": "Content of this segment",  # Required
    "start": 330.5,  # Optional: seconds
    "end": 345.2,    # Optional: seconds
    "id": 0          # Optional: segment index
}
```

### Document

```python
{
    "type": "slide",      # "slide" or "pdf"
    "id": 5,              # Unique identifier
    "text": "Content...",  # Required: full text for embedding
    "slide_number": 5,    # Optional
    "title": "Title",     # Optional
    "bullets": ["..."]    # Optional: structured content
}
```

### Alignment Result

```python
{
    "timestamp": "00:05:30",
    "video_text": "Segment content",
    "match": {
        "type": "slide",
        "id": 5,
        "reason": "This slide explains the concept mentioned in the video segment"
    }
}
```

---

## Configuration

### Environment Variables

None required (all local processing).

### Ollama Configuration

Edit `llm_engine.py` constants:

```python
OLLAMA_HOST = "http://127.0.0.1:11434"  # Ollama server address
OLLAMA_MODEL = "llama3"                  # Model name
```

### Embedding Model

Edit `alignment_engine.py` constant:

```python
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # From sentence-transformers
```

To use different model:

```python
from alignment_engine import link_segments_to_documents, EmbeddingEngine

engine = EmbeddingEngine("sentence-transformers/all-mpnet-base-v2")
engine.load_model()
# Then pass to get_top_k_matches() or create custom pipeline
```

---

## Performance Characteristics

| Operation                                   | Time    | Notes                  |
| ------------------------------------------- | ------- | ---------------------- |
| Load embedding model                        | ~5-10s  | First run only; cached |
| Encode 1 segment                            | <100ms  | 384-dim embeddings     |
| Cosine similarity (1 vs N)                  | <10ms   | For N=100 documents    |
| LLM matching (1 segment)                    | 2-5s    | Ollama inference time  |
| Full pipeline (10 segments + 50 docs)       | ~30-60s | With LLM               |
| Embedding-only mode (10 segments + 50 docs) | ~1-2s   | No LLM                 |

---

## Error Handling

All functions implement graceful fallbacks:

```python
try:
    # Use LLM refinement
    match = match_segment_to_document(segment, candidates)
except Exception as e:
    # Fallback to best candidate
    match = {
        "type": candidates[0]["type"],
        "id": candidates[0]["id"],
        "reason": f"LLM error: {e}"
    }
```

---

## Integration Examples

### FastAPI Endpoint

```python
from fastapi import FastAPI, File, UploadFile
from alignment_engine import process_video_and_document

@app.post("/align")
async def align_video_to_docs(
    video: UploadFile = File(...),
    document: UploadFile = File(...)
):
    video_path = f"/tmp/{video.filename}"
    doc_path = f"/tmp/{document.filename}"

    # Save uploaded files
    with open(video_path, "wb") as f:
        f.write(await video.read())
    with open(doc_path, "wb") as f:
        f.write(await document.read())

    # Run alignment
    results = process_video_and_document(video_path, doc_path, use_llm=True)

    return {"alignments": results}
```

### Batch Processing

```python
from alignment_engine import link_segments_to_documents

all_results = []
for batch in segments_batches:
    results = link_segments_to_documents(batch, docs, use_llm=True)
    all_results.extend(results)
```

---

## Troubleshooting

See SETUP_GUIDE.md for detailed troubleshooting.

Quick fixes:

1. **ImportError**: `pip install sentence-transformers scikit-learn numpy requests`
2. **Ollama timeout**: Start with `ollama run llama3`
3. **No ffmpeg**: Install system ffmpeg
4. **Memory errors**: Use `use_llm=False` mode

---

## License & Attribution

- Sentence-Transformers: https://www.sbert.net/
- Ollama: https://ollama.com/
- Whisper: https://github.com/openai/whisper
- scikit-learn: https://scikit-learn.org/
