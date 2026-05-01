import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Film,
  FileText,
  Zap,
  Brain,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import DropZone from "../components/DropZone";
import ProcessingScreen from "../components/ProcessingScreen";
import api, { uploadVideo, uploadDocument } from "../utils/api";
import useProcessing from "../hooks/useProcessing";

export default function UploadPage() {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState("");
  const { status, progress, startPipeline } = useProcessing();

  const isProcessing = status === "processing" || status === "queued";

  const handleStart = async () => {
    if (!videoFile && !docFile) {
      setError("Upload at least a video or document.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      if (videoFile) {
        const response = await uploadVideo(videoFile, (p) =>
          setUploadProgress((prev) => ({ ...prev, video: p })),
        );
        const remotePath = response?.data?.path;
        if (remotePath) {
          const videoUrl = `${api.defaults.baseURL}${remotePath}`;
          localStorage.setItem("insighted_video_src", videoUrl);
        }
      }
      if (docFile) {
        await uploadDocument(docFile, (p) =>
          setUploadProgress((prev) => ({ ...prev, doc: p })),
        );
      }
      await startPipeline();
    } catch (e) {
      setError(
        e.response?.data?.detail || "Upload failed. Is the backend running?",
      );
      setUploading(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <ProcessingScreen progress={progress} status={status} />
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 flex flex-col items-center gap-6 animate-slide-up">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: "rgba(200,241,53,0.1)",
            border: "2px solid rgba(200,241,53,0.3)",
          }}
        >
          <CheckCircle2 size={40} style={{ color: "var(--acid)" }} />
        </div>
        <h2
          className="font-display text-3xl text-center"
          style={{ color: "var(--text-primary)" }}
        >
          Content Processed!
        </h2>
        <p className="text-center" style={{ color: "var(--text-muted)" }}>
          Your lecture has been annotated and analyzed. Ready to learn.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/learn")}
            className="px-6 py-3 rounded-xl font-medium"
            style={{ background: "var(--acid)", color: "#0a0a0f" }}
          >
            Start Learning →
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 rounded-xl font-medium"
            style={{
              background: "var(--ink-700)",
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            View Analytics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12 animate-slide-up">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{
            background: "rgba(200,241,53,0.08)",
            border: "1px solid rgba(200,241,53,0.2)",
          }}
        >
          <Brain size={14} style={{ color: "var(--acid)" }} />
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--acid)", letterSpacing: "0.06em" }}
          >
            LOCAL AI — NO API KEYS REQUIRED
          </span>
        </div>
        <h1
          className="font-display text-5xl mb-4"
          style={{
            color: "var(--text-primary)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Upload your
          <br />
          <span style={{ color: "var(--acid)" }}>lecture content</span>
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            maxWidth: 400,
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          InsightEd analyses videos and slides locally — extracting concepts,
          detecting confusion, and building a personalised learning path.
        </p>
      </div>

      {/* Features row */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { icon: "🎙️", label: "Whisper ASR", desc: "Auto-transcription" },
          { icon: "🧠", label: "Embeddings", desc: "Semantic alignment" },
          { icon: "📊", label: "Analytics", desc: "Confusion detection" },
        ].map((f, i) => (
          <div
            key={i}
            className="rounded-xl p-3 text-center"
            style={{
              background: "var(--ink-800)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="text-2xl mb-1">{f.icon}</div>
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {f.label}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Upload zones */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <DropZone
          accept="video/*,.mp4,.webm,.avi,.mov"
          label="Drop lecture video"
          hint=".mp4, .webm, .avi"
          icon={Film}
          uploaded={videoFile?.name}
          onFile={setVideoFile}
        />
        <DropZone
          accept=".pdf,.pptx"
          label="Drop slides / PDF"
          hint=".pptx or .pdf"
          icon={FileText}
          uploaded={docFile?.name}
          onFile={setDocFile}
        />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "var(--ink-800)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {videoFile && (
            <div className="mb-3">
              <div
                className="flex justify-between text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Uploading video</span>
                <span style={{ color: "var(--acid)" }}>
                  {uploadProgress.video || 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress.video || 0}%` }}
                />
              </div>
            </div>
          )}
          {docFile && (
            <div>
              <div
                className="flex justify-between text-xs mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Uploading document</span>
                <span style={{ color: "var(--acid)" }}>
                  {uploadProgress.doc || 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress.doc || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl mb-4"
          style={{
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.2)",
          }}
        >
          <AlertCircle size={14} style={{ color: "var(--coral)" }} />
          <p className="text-sm" style={{ color: "var(--coral)" }}>
            {error}
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleStart}
        disabled={uploading || (!videoFile && !docFile)}
        className="w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all"
        style={{
          background: !videoFile && !docFile ? "var(--ink-700)" : "var(--acid)",
          color: !videoFile && !docFile ? "var(--text-muted)" : "#0a0a0f",
          cursor: !videoFile && !docFile ? "not-allowed" : "pointer",
        }}
      >
        <Zap size={20} strokeWidth={2.5} />
        {uploading ? "Uploading…" : "Process with AI"}
      </button>
      <p
        className="text-center text-xs mt-3"
        style={{ color: "var(--text-muted)" }}
      >
        Processing runs entirely on your machine — no data leaves your device
      </p>
    </div>
  );
}
