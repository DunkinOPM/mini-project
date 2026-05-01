"""
InsightEd – AI-Powered Video Annotation and Adaptive Learning System
Main FastAPI Application
"""

import os
import json
import shutil
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="InsightEd API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"

for d in [UPLOAD_DIR, STATIC_DIR, DATA_DIR]:
    d.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

session: Dict[str, Any] = {
    "video_path": None,
    "document_path": None,
    "transcript": [],
    "slides": [],
    "embeddings": {},
    "annotations": [],
    "alignment": [],
    "analytics": {},
    "behavior_logs": [],
    "processing_status": "idle",
    "processing_progress": 0,
    "processing_error": "",
}

class BehaviorEvent(BaseModel):
    event_type: str
    timestamp: float
    value: Optional[float] = None

class QueryRequest(BaseModel):
    query: str

class RecommendRequest(BaseModel):
    concept: Optional[str] = None
    timestamp: Optional[float] = None

# ── Lazy module loaders ──────────────────────────────────────────────────────

_video_processor = None
_doc_processor = None
_embed_engine = None
_annotation_engine = None
_alignment_engine = None
_analytics_engine = None
_search_engine = None

def get_video_processor():
    global _video_processor
    if _video_processor is None:
        from video_processor import VideoProcessor
        _video_processor = VideoProcessor()
    return _video_processor

def get_doc_processor():
    global _doc_processor
    if _doc_processor is None:
        from document_processor import DocumentProcessor
        _doc_processor = DocumentProcessor()
    return _doc_processor

def get_embed_engine():
    global _embed_engine
    if _embed_engine is None:
        from embedding_engine import EmbeddingEngine
        _embed_engine = EmbeddingEngine()
    return _embed_engine

def get_annotation_engine():
    global _annotation_engine
    if _annotation_engine is None:
        from annotation_engine import AnnotationEngine
        _annotation_engine = AnnotationEngine(get_embed_engine())
    return _annotation_engine

def get_alignment_engine():
    global _alignment_engine
    if _alignment_engine is None:
        from alignment_engine import AlignmentEngine
        _alignment_engine = AlignmentEngine(get_embed_engine())
    return _alignment_engine

def get_analytics_engine():
    global _analytics_engine
    if _analytics_engine is None:
        from analytics_engine import AnalyticsEngine
        _analytics_engine = AnalyticsEngine()
    return _analytics_engine

def get_search_engine():
    global _search_engine
    if _search_engine is None:
        from search_engine import SearchEngine
        _search_engine = SearchEngine(get_embed_engine())
    return _search_engine

# ── Pipeline ─────────────────────────────────────────────────────────────────

def _update(status=None, progress=None):
    if status:
        session["processing_status"] = status
    if progress is not None:
        session["processing_progress"] = progress

async def run_pipeline():
    try:
        _update("processing", 5)
        loop = asyncio.get_event_loop()

        # Step 1: Video
        if session["video_path"]:
            _update(progress=10)
            print("[Pipeline] Step 1: Video processing")
            vp = get_video_processor()
            transcript = await loop.run_in_executor(None, vp.process, session["video_path"])
            session["transcript"] = transcript or []
            print(f"[Pipeline] Transcript: {len(session['transcript'])} segments")
            _update(progress=35)

        # Step 2: Document
        if session["document_path"]:
            _update(progress=40)
            print("[Pipeline] Step 2: Document processing")
            dp = get_doc_processor()
            slides = await loop.run_in_executor(None, dp.process, session["document_path"])
            session["slides"] = slides or []
            print(f"[Pipeline] Slides: {len(session['slides'])}")
            _update(progress=55)

        # If no real content, use mocks
        if not session["transcript"]:
            from video_processor import VideoProcessor
            session["transcript"] = VideoProcessor._mock_transcript(None, "")
        if not session["slides"]:
            from document_processor import DocumentProcessor
            session["slides"] = DocumentProcessor._mock_slides(None)

        # Step 3: Embeddings
        _update(progress=60)
        print("[Pipeline] Step 3: Embeddings")
        ee = get_embed_engine()
        embeddings = await loop.run_in_executor(
            None, ee.compute_all, session["transcript"], session["slides"]
        )
        session["embeddings"] = embeddings
        _update(progress=72)

        # Step 4: Annotations
        print("[Pipeline] Step 4: Annotations")
        ae = get_annotation_engine()
        annotations = await loop.run_in_executor(
            None, ae.annotate_transcript, session["transcript"], embeddings
        )
        session["annotations"] = annotations or []
        _update(progress=82)

        # Step 5: Alignment (Hybrid Embedding + LLM)
        print("[Pipeline] Step 5: Alignment (hybrid embedding + Gemini LLM)")
        from alignment_engine import link_segments_to_documents
        alignment = await loop.run_in_executor(
            None, link_segments_to_documents, session["transcript"], session["slides"], True
        )
        print(f"[Pipeline] Alignment complete: {len(alignment)} matched segments")
        
        session["alignment"] = alignment or []
        _update(progress=92)

        # Step 6: Analytics
        print("[Pipeline] Step 6: Analytics")
        an = get_analytics_engine()
        analytics = await loop.run_in_executor(
            None, an.generate, session["behavior_logs"], session["alignment"], session["transcript"]
        )
        session["analytics"] = analytics or {}

        _update("done", 100)
        print("[Pipeline] ✓ Complete!")
        _save_session()

    except Exception as e:
        import traceback
        print(f"[Pipeline] ERROR: {e}")
        traceback.print_exc()
        session["processing_status"] = "error"
        session["processing_error"] = str(e)

def _save_session():
    try:
        out = {k: v for k, v in session.items() if k != "embeddings"}
        with open(DATA_DIR / "session.json", "w") as f:
            json.dump(out, f, indent=2)
    except Exception as e:
        print(f"[Pipeline] Could not save session: {e}")

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "InsightEd API running"}

@app.get("/status")
def get_status():
    return {
        "status": session["processing_status"],
        "progress": session["processing_progress"],
        "error": session.get("processing_error", ""),
        "has_video": session["video_path"] is not None,
        "has_document": session["document_path"] is not None,
        "transcript_segments": len(session["transcript"]),
        "slides_count": len(session["slides"]),
        "annotations_count": len(session["annotations"]),
    }

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    dest = UPLOAD_DIR / f"video_{file.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    session["video_path"] = str(dest)
    session["processing_status"] = "idle"
    return {"message": "Video uploaded", "filename": file.filename, "path": f"/uploads/video_{file.filename}"}

@app.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    dest = UPLOAD_DIR / f"doc_{file.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    session["document_path"] = str(dest)
    return {"message": "Document uploaded", "filename": file.filename}

@app.post("/process")
async def process(background_tasks: BackgroundTasks):
    if session["processing_status"] == "processing":
        return {"message": "Already processing"}
    session["processing_status"] = "queued"
    session["processing_progress"] = 0
    session["processing_error"] = ""
    background_tasks.add_task(run_pipeline)
    return {"message": "Processing started"}

@app.get("/annotations")
def get_annotations():
    return {"annotations": session["annotations"], "total": len(session["annotations"])}

@app.get("/alignment")
def get_alignment():
    return {"alignment": session["alignment"], "total": len(session["alignment"])}

@app.get("/analytics")
def get_analytics():
    an = get_analytics_engine()
    updated = an.generate(session["behavior_logs"], session["alignment"], session["transcript"])
    session["analytics"] = updated
    return updated

@app.get("/slides")
def get_slides():
    return {"slides": session["slides"], "total": len(session["slides"])}

@app.get("/transcript")
def get_transcript():
    return {"transcript": session["transcript"], "total": len(session["transcript"])}

@app.post("/behavior")
def track_behavior(event: BehaviorEvent):
    session["behavior_logs"].append(event.dict())
    return {"message": "logged"}

@app.post("/search")
def search(req: QueryRequest):
    se = get_search_engine()
    return se.search(req.query, session["transcript"], session["slides"], session["embeddings"])

@app.post("/recommend")
def recommend(req: RecommendRequest):
    ae = get_annotation_engine()
    results = ae.recommend(
        concept=req.concept,
        timestamp=req.timestamp,
        transcript=session["transcript"],
        slides=session["slides"],
        embeddings=session["embeddings"],
        analytics=session["analytics"],
    )
    return {
        "recommendations": results.get("recommendations", []),
        "resources": results.get("resources", []),
    }

@app.delete("/reset")
def reset_session():
    for k in list(session.keys()):
        if k in ("video_path", "document_path"):
            session[k] = None
        elif isinstance(session[k], list):
            session[k] = []
        elif isinstance(session[k], dict):
            session[k] = {}
        elif k == "processing_status":
            session[k] = "idle"
        elif k == "processing_progress":
            session[k] = 0
        elif k == "processing_error":
            session[k] = ""
    return {"message": "Reset"}

# ── HYBRID ALIGNMENT ENDPOINTS (Embedding + LLM) ──────────────────────────────

@app.post("/align-hybrid")
async def align_hybrid(use_llm: bool = True):
    """
    Perform hybrid alignment (embedding + optional LLM) on already-uploaded files.
    Requires both transcript and slides to be already processed.
    
    Args:
        use_llm: Whether to use Gemini LLM for refinement (default: True)
    
    Returns:
        Alignment results with timestamp → slide/page mappings and reasoning
    """
    if not session.get("transcript") or not session.get("slides"):
        raise HTTPException(
            status_code=400,
            detail="Missing transcript or slides. Run /process first."
        )
    
    try:
        from alignment_engine import link_segments_to_documents
        
        print(f"[API] Starting hybrid alignment (use_llm={use_llm})")
        alignments = link_segments_to_documents(
            session["transcript"],
            session["slides"],
            use_llm=use_llm
        )
        
        session["alignment"] = alignments
        return {
            "status": "success",
            "alignments": alignments,
            "total": len(alignments),
            "method": "hybrid_llm" if use_llm else "embedding_only"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/align-direct")
async def align_direct(
    video: UploadFile = File(...),
    document: UploadFile = File(...),
    use_llm: bool = True
):
    """
    Direct alignment endpoint: Upload video + document and get alignments in one call.
    Fully processes video and document without storing in session.
    
    Args:
        video: MP4 video file
        document: PDF or PPTX file
        use_llm: Whether to use Gemini LLM for refinement
    
    Returns:
        Alignment results with reasoning
    """
    import tempfile
    
    try:
        # Save uploaded files to temp location
        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = Path(tmpdir) / f"video_{video.filename}"
            doc_path = Path(tmpdir) / f"doc_{document.filename}"
            
            with open(video_path, "wb") as f:
                shutil.copyfileobj(video.file, f)
            with open(doc_path, "wb") as f:
                shutil.copyfileobj(document.file, f)
            
            print(f"[API] Direct alignment: {video.filename} + {document.filename} (llm={use_llm})")
            
            from alignment_engine import process_video_and_document
            
            alignments = process_video_and_document(
                str(video_path),
                str(doc_path),
                use_llm=use_llm
            )
            
            return {
                "status": "success",
                "alignments": alignments,
                "total": len(alignments),
                "method": "hybrid_llm" if use_llm else "embedding_only",
                "video_name": video.filename,
                "document_name": document.filename
            }
    
    except Exception as e:
        print(f"[API] Error in direct alignment: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_full_pipeline(
    video: UploadFile = File(...),
    document: UploadFile = File(...)
):
    """
    Full Analysis Pipeline: Upload video + document and get full mappings and annotations.
    """
    import tempfile
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            video_path = Path(tmpdir) / f"video_{video.filename}"
            doc_path = Path(tmpdir) / f"doc_{document.filename}"
            
            with open(video_path, "wb") as f:
                shutil.copyfileobj(video.file, f)
            with open(doc_path, "wb") as f:
                shutil.copyfileobj(document.file, f)
            
            print(f"[API] Starting full analyze pipeline: {video.filename} + {document.filename}")
            
            vp = get_video_processor()
            dp = get_doc_processor()
            ee = get_embed_engine()
            ae = get_annotation_engine()
            from alignment_engine import link_segments_to_documents
            
            # 1. Process Video
            print("[Analyze] Processing video...")
            transcript = vp.process(str(video_path))
            if not transcript:
                 transcript = vp._mock_transcript(None, "")
                 
            # 2. Process Document
            print("[Analyze] Processing document...")
            slides = dp.process(str(doc_path))
            if not slides:
                 slides = dp._mock_slides(None)
                 
            # 3. Embeddings
            print("[Analyze] Generating embeddings...")
            embeddings = ee.compute_all(transcript, slides)
            
            # 4. Align Segments
            print("[Analyze] Linking segments to documents using Gemini...")
            alignments = link_segments_to_documents(transcript, slides, use_llm=True)
            
            # 5. Annotations
            print("[Analyze] Generating annotations using Gemini...")
            annotations = ae.annotate_transcript(transcript, embeddings)
            
            return JSONResponse(content={
                "status": "success",
                "video_name": video.filename,
                "document_name": document.filename,
                "transcript_segments_count": len(transcript),
                "slides_count": len(slides),
                "mappings": alignments,
                "annotations": annotations
            })
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
