import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  BookOpen,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import VideoPlayer from "../components/VideoPlayer";
import AnnotationPanel from "../components/AnnotationPanel";
import SlideViewer from "../components/SlideViewer";
import Recommendations from "../components/Recommendations";
import useProcessing from "../hooks/useProcessing";
import {
  getAnnotations,
  getAlignment,
  getSlides,
  getAnalytics,
} from "../utils/api";

const TABS = [
  { id: "annotations", label: "Annotations", icon: MessageSquare },
  { id: "slides", label: "Slides", icon: BookOpen },
  { id: "recommendations", label: "Insights", icon: Lightbulb },
];

export default function LearningPage() {
  const navigate = useNavigate();
  const { status } = useProcessing();
  const [currentTime, setCurrentTime] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [alignment, setAlignment] = useState([]);
  const [slides, setSlides] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [activeTab, setActiveTab] = useState("annotations");
  const [videoSrc, setVideoSrc] = useState(null);
  const [seekTarget, setSeekTarget] = useState(null);

  useEffect(() => {
    const savedVideo = localStorage.getItem("insighted_video_src");
    if (savedVideo) {
      setVideoSrc(savedVideo);
    }
  }, []);

  useEffect(() => {
    if (status === "done") loadData();
  }, [status]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ann, ali, sl, an] = await Promise.all([
        getAnnotations(),
        getAlignment(),
        getSlides(),
        getAnalytics(),
      ]);
      setAnnotations(ann.data.annotations || []);
      setAlignment(ali.data.alignment || []);
      setSlides(sl.data.slides || []);
      setAnalytics(an.data || {});
    } catch {}
  };

  const handleSeek = useCallback((seconds) => {
    const seekTime = Number(seconds);
    if (!Number.isFinite(seekTime)) return;
    setSeekTarget(seekTime);
    setTimeout(() => setSeekTarget(null), 100);
  }, []);

  const currentSlideId = (() => {
    const match = alignment.find(
      (a) => currentTime >= a.start && currentTime <= a.end,
    );
    return match ? match.slide_id : 0;
  })();

  return (
    <div
      className="flex flex-col h-full"
      style={{ minHeight: "calc(100vh - 65px)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-6 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} /> Upload
        </button>
        <div
          className="w-px h-4"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Learning Session
        </span>
        {status === "done" && (
          <span
            className="tag"
            style={{
              background: "rgba(200,241,53,0.1)",
              color: "var(--acid)",
              border: "1px solid rgba(200,241,53,0.2)",
            }}
          >
            AI Processed
          </span>
        )}
        <button
          onClick={loadData}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Main layout */}
      <div
        className="flex-1 grid gap-4 p-6"
        style={{ gridTemplateColumns: "1fr 380px" }}
      >
        {/* Left: Video + Slides */}
        <div className="flex flex-col gap-4">
          <VideoPlayer
            videoSrc={videoSrc}
            annotations={annotations}
            alignment={alignment}
            onTimeUpdate={setCurrentTime}
            seekTo={seekTarget}
          />

          {/* Video file picker (since we can't stream from backend easily) */}
          {!videoSrc && (
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{
                background: "var(--ink-800)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Load local video file for playback:
              </span>
              <label
                className="px-4 py-2 rounded-lg text-sm cursor-pointer font-medium"
                style={{
                  background: "rgba(200,241,53,0.1)",
                  color: "var(--acid)",
                  border: "1px solid rgba(200,241,53,0.2)",
                }}
              >
                Choose file
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) setVideoSrc(URL.createObjectURL(f));
                  }}
                />
              </label>
            </div>
          )}

          <SlideViewer
            slides={slides}
            currentSlideId={currentSlideId}
            alignment={alignment}
            currentTime={currentTime}
          />
        </div>

        {/* Right: Tabbed panel */}
        <div
          className="flex flex-col"
          style={{
            background: "var(--ink-800)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Tabs */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all"
                style={{
                  background:
                    activeTab === id ? "rgba(200,241,53,0.06)" : "transparent",
                  color: activeTab === id ? "var(--acid)" : "var(--text-muted)",
                  borderBottom:
                    activeTab === id
                      ? "2px solid var(--acid)"
                      : "2px solid transparent",
                }}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "annotations" && (
              <AnnotationPanel
                annotations={annotations}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            )}
            {activeTab === "slides" && (
              <div className="flex flex-col gap-3">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  ALL SLIDES ({slides.length})
                </p>
                {slides.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                    style={{
                      background: "var(--ink-700)",
                      border: `1px solid ${currentSlideId === i ? "rgba(200,241,53,0.3)" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{
                        color:
                          currentSlideId === i
                            ? "var(--acid)"
                            : "var(--text-muted)",
                      }}
                    >
                      Slide {s.slide_number}
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.title}
                    </p>
                    {s.bullets?.slice(0, 2).map((b, j) => (
                      <p
                        key={j}
                        className="text-xs mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        • {b}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {activeTab === "recommendations" && (
              <Recommendations
                analytics={analytics}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
