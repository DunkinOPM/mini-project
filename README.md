# InsightEd — AI-Powered Video Annotation & Adaptive Learning System

> Fully local, no API keys required. Powered by Whisper, Sentence Transformers, and spaCy.

---

## ⚡ Quick Start

### 1. Start the Backend (Terminal 1)
```bash
cd insighted
bash start_backend.sh
```
Backend runs on → **http://localhost:8000**

### 2. Start the Frontend (Terminal 2)
```bash
cd insighted
bash start_frontend.sh
```
Frontend runs on → **http://localhost:5173**

---

## 🧰 Requirements

| Tool       | Version     |
|------------|-------------|
| Python     | ≥ 3.9       |
| Node.js    | ≥ 18        |
| npm        | ≥ 9         |
| ffmpeg     | any recent  |

Install ffmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
choco install ffmpeg
```

---

## 🗂️ Project Structure

```
insighted/
├── backend/
│   ├── main.py                # FastAPI app + endpoints
│   ├── video_processor.py     # Audio extraction + Whisper ASR
│   ├── document_processor.py  # PPT/PDF text extraction
│   ├── embedding_engine.py    # Sentence Transformers (all-MiniLM-L6-v2)
│   ├── annotation_engine.py   # Concept extraction + recommendations
│   ├── alignment_engine.py    # Video ↔ slide alignment
│   ├── analytics_engine.py    # Confusion detection + learning analytics
│   ├── search_engine.py       # Local cosine similarity search
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx       # Drag-and-drop upload + processing
│   │   │   ├── LearningPage.jsx     # Video + annotations + slides
│   │   │   └── DashboardPage.jsx    # Analytics charts + insights
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── VideoPlayer.jsx      # Custom player with annotation markers
│   │   │   ├── AnnotationPanel.jsx  # Timestamped concepts + search
│   │   │   ├── SlideViewer.jsx      # Auto-sync slide viewer
│   │   │   ├── Recommendations.jsx  # AI recommendations
│   │   │   ├── ProcessingScreen.jsx # Progress UI
│   │   │   └── DropZone.jsx
│   │   ├── hooks/
│   │   │   └── useProcessing.js     # Polling hook for pipeline status
│   │   └── utils/
│   │       ├── api.js               # Axios API client
│   │       └── format.js            # Utility formatters
│   └── package.json
│
├── start_backend.sh
├── start_frontend.sh
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint            | Description                        |
|--------|---------------------|------------------------------------|
| POST   | `/upload-video`     | Upload lecture video               |
| POST   | `/upload-document`  | Upload PPT or PDF slides           |
| POST   | `/process`          | Trigger full AI pipeline           |
| GET    | `/status`           | Poll processing status + progress  |
| GET    | `/annotations`      | Get video annotations              |
| GET    | `/alignment`        | Get video→slide alignment map      |
| GET    | `/analytics`        | Get learning analytics             |
| GET    | `/slides`           | Get extracted slide data           |
| GET    | `/transcript`       | Get full transcript                |
| POST   | `/behavior`         | Log user interaction event         |
| POST   | `/search`           | Semantic concept search            |
| POST   | `/recommend`        | Get content recommendations        |
| DELETE | `/reset`            | Clear session                      |

---

## 🤖 Local AI Models Used

| Model                       | Purpose                          | Size     |
|-----------------------------|----------------------------------|----------|
| `openai/whisper-base`       | Speech-to-text (video → text)    | ~150 MB  |
| `all-MiniLM-L6-v2`          | Sentence embeddings              | ~90 MB   |
| `en_core_web_sm` (spaCy)    | NLP tokenization                 | ~12 MB   |

All models are downloaded automatically on first run and cached locally.

---

## 🎯 System Flow

```
Upload Video + Slides
        ↓
Video → Audio → Whisper → Timestamped Transcript
        ↓
Slides → PPT/PDF Parser → Structured Text
        ↓
Sentence Transformers → Embeddings
        ↓
Cosine Similarity → Annotations + Alignment
        ↓
User Watches Video → Pause/Replay Tracked
        ↓
Confusion Detection → Analytics
        ↓
Recommendations Served
```

---

## 🔧 Troubleshooting

**"Backend not found"** — Make sure `uvicorn` is running on port 8000 before opening the frontend.

**Whisper is slow** — First run downloads the model. Use `whisper.load_model("tiny")` in `video_processor.py` for faster (less accurate) transcription.

**No sentence-transformers** — Falls back to TF-IDF. Install with: `pip install sentence-transformers`

**No moviepy/ffmpeg** — Install ffmpeg system-wide (see above).
