# Setup Guide: Alignment Engine

## System Requirements

- Python 3.8+
- Windows, macOS, or Linux
- ffmpeg (for audio processing)
- Ollama (for local LLM)

## Step 1: Install System Dependencies

### Windows

#### Install ffmpeg:

```powershell
# Using winget
winget install ffmpeg

# Or using Chocolatey
choco install ffmpeg
```

#### Install Ollama:

```powershell
# Using winget
winget install Ollama.Ollama

# Or download from https://ollama.com
```

### macOS

```bash
# Install ffmpeg
brew install ffmpeg

# Install Ollama
brew install ollama
```

### Linux (Ubuntu/Debian)

```bash
# Install ffmpeg
sudo apt-get install ffmpeg

# Install Ollama
curl https://ollama.ai/install.sh | sh
```

## Step 2: Install Python Dependencies

```bash
cd c:\Users\Admin\Desktop\midrev\insighted\backend

pip install \
  sentence-transformers \
  scikit-learn \
  numpy \
  requests \
  openai-whisper \
  python-pptx \
  PyMuPDF \
  pdfplumber \
  moviepy
```

## Step 3: Download Ollama Model

In a new terminal:

```bash
ollama pull llama3
```

This downloads the llama3 model (~5 GB).

## Step 4: Start Ollama Server

Keep this terminal open while using the alignment engine:

```bash
ollama run llama3
```

You should see:

```
starting ollama serve...
Listening on http://127.0.0.1:11434
```

## Step 5: Test the Installation

In another terminal:

```bash
cd c:\Users\Admin\Desktop\midrev\insighted\backend

# Run the demo
python alignment_engine.py
```

Expected output:

```
======================================================================
ALIGNMENT ENGINE - DEMO
======================================================================
[AlignmentEngine] Loading embedding model...
[AlignmentEngine] Checking Ollama readiness...
[AlignmentEngine] Processing segment 1/3
[AlignmentEngine] Processing segment 2/3
[AlignmentEngine] Processing segment 3/3

======================================================================
RESULTS
======================================================================
[
  {
    "timestamp": "02:30",
    "video_text": "dynamic programming avoids recomputation",
    "match": {
      "type": "slide",
      "id": 5,
      "reason": "..."
    }
  },
  ...
]
```

## Step 6: Use in Your Code

```python
from alignment_engine import link_segments_to_documents, process_video_and_document

# Option 1: Using sample data
video_segments = [
    {"timestamp": "02:30", "text": "topic explained"}
]
documents = [
    {"type": "slide", "id": 5, "text": "slide content"}
]
results = link_segments_to_documents(video_segments, documents, use_llm=True)

# Option 2: Process real video and document
results = process_video_and_document("lecture.mp4", "slides.pptx", use_llm=True)

# Option 3: Embedding-only (no LLM, faster)
results = link_segments_to_documents(video_segments, documents, use_llm=False)
```

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'sentence_transformers'"

Solution:

```bash
pip install sentence-transformers scikit-learn numpy requests
```

### Issue: "RuntimeError: Ollama is not running"

Solution: Start Ollama in a separate terminal:

```bash
ollama run llama3
```

### Issue: ffmpeg not found

Solution:

```bash
# Windows
winget install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

### Issue: Ollama API connection timeout

Solution:

1. Ensure Ollama is running: `ollama run llama3`
2. Check firewall allows http://127.0.0.1:11434
3. Restart Ollama

### Issue: Out of memory errors

Solution:

- Use embedding-only mode: `use_llm=False`
- Process videos in chunks
- Use smaller document batches

## Production Deployment

For production, consider:

1. **Docker**: Containerize with all dependencies
2. **Async Processing**: Use async/await for large jobs
3. **Caching**: Cache embeddings and model predictions
4. **Monitoring**: Log all API calls and responses
5. **Error Recovery**: Implement retry logic with exponential backoff

## Performance Tuning

- First run: ~10-15 seconds (model loading)
- Subsequent runs: ~1-2 seconds per segment
- LLM calls: ~2-5 seconds per decision
- Embedding-only mode: <100ms per segment

To speed up:

1. Use embedding-only mode
2. Reduce top-K candidates (currently 3)
3. Use GPU acceleration (if available)

## Next Steps

1. Run the demo: `python alignment_engine.py`
2. Read ALIGNMENT_ENGINE_README.md for detailed API docs
3. Integrate into your FastAPI backend
4. Process real video and document files
