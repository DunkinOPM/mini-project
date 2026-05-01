import { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { formatTime } from "../utils/format";
import { trackBehavior } from "../utils/api";

export default function VideoPlayer({
  videoSrc,
  annotations = [],
  alignment = [],
  onTimeUpdate,
  seekTo,
}) {
  const videoRef = useRef();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const pendingSeekRef = useRef(null);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
      trackBehavior({ event_type: "pause", timestamp: currentTime });
    }
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * duration;
    const prev = videoRef.current.currentTime;
    videoRef.current.currentTime = t;
    if (t < prev - 2)
      trackBehavior({ event_type: "replay", timestamp: t, value: prev - t });
    else trackBehavior({ event_type: "seek", timestamp: t });
  };

  const seekToTime = (seconds) => {
    if (!videoRef.current) return;
    const target = Number(seconds);
    if (!Number.isFinite(target)) return;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    onTimeUpdate && onTimeUpdate(target);
    trackBehavior({ event_type: "seek", timestamp: target });
  };

  const changeSpeed = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    trackBehavior({
      event_type: "speed_change",
      timestamp: currentTime,
      value: s,
    });
  };

  const handleLoadedMetadata = (e) => {
    const v = e.target;
    setDuration(v.duration);
    if (typeof pendingSeekRef.current === "number") {
      const seekValue = pendingSeekRef.current;
      pendingSeekRef.current = null;
      v.currentTime = seekValue;
      setCurrentTime(seekValue);
      onTimeUpdate && onTimeUpdate(seekValue);
    }
  };

  const handleTimeUpdate = (e) => {
    const t = e.target.currentTime;
    setCurrentTime(t);
    onTimeUpdate && onTimeUpdate(t);
  };

  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (!videoSrc) return;
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    videoRef.current.load();
  }, [videoSrc]);

  useEffect(() => {
    const target = Number(seekTo);
    if (!Number.isFinite(target) || !videoRef.current) return;
    if (videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
      onTimeUpdate && onTimeUpdate(target);
    } else {
      pendingSeekRef.current = target;
    }
  }, [seekTo, onTimeUpdate]);

  const pct = duration ? (currentTime / duration) * 100 : 0;

  // Current aligned slide
  const currentAlign = alignment.find(
    (a) => currentTime >= a.start && currentTime <= a.end,
  );

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--ink-800)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Video */}
      <div
        className="relative"
        style={{ aspectRatio: "16/9", background: "#000" }}
      >
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            controls
            preload="metadata"
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={() => {
              const v = videoRef.current;
              if (v) setCurrentTime(v.currentTime);
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">🎬</div>
              <p className="text-sm">Upload a video to begin</p>
            </div>
          </div>
        )}

        {/* Current concept overlay */}
        {currentAlign && (
          <div
            className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: "rgba(10,10,15,0.85)",
              color: "var(--acid)",
              border: "1px solid rgba(200,241,53,0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            📍 {currentAlign.concept} — Slide {currentAlign.slide_id + 1}
          </div>
        )}
      </div>

      {/* Timeline with annotation markers */}
      <div className="px-4 pt-3">
        <div
          className="relative h-2 rounded-full cursor-pointer"
          style={{ background: "var(--ink-600)" }}
          onClick={seek}
        >
          {/* Progress */}
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--acid), var(--sky))",
              transition: "width 0.1s",
            }}
          />

          {/* Annotation markers */}
          {duration > 0 &&
            annotations.map((ann, i) => (
              <div
                key={i}
                className="marker"
                style={{
                  left: `${(ann.start / duration) * 100}%`,
                  background: "var(--amber)",
                  opacity: 0.85,
                }}
                title={`${ann.timestamp} — ${ann.primary_concept}`}
                onClick={(e) => {
                  e.stopPropagation();
                  seekToTime(ann.start);
                }}
              />
            ))}

          {/* Confusion markers */}
          {duration > 0 &&
            alignment
              .filter((a) => a.confusion)
              .map((a, i) => (
                <div
                  key={`c${i}`}
                  className="marker"
                  style={{
                    left: `${(a.start / duration) * 100}%`,
                    background: "var(--coral)",
                    opacity: 0.7,
                  }}
                />
              ))}

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg"
            style={{
              left: `${pct}%`,
              transform: "translate(-50%,-50%)",
              background: "#fff",
              boxShadow: "0 0 0 3px rgba(200,241,53,0.4)",
            }}
          />
        </div>

        {/* Marker legend */}
        <div
          className="flex gap-4 mt-1.5 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm inline-block"
              style={{ background: "var(--amber)" }}
            />{" "}
            Concept
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm inline-block"
              style={{ background: "var(--coral)" }}
            />{" "}
            Difficult
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => seekToTime(Math.max(0, currentTime - 10))}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={toggle}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{ background: "var(--acid)", color: "#0a0a0f" }}
        >
          {playing ? (
            <Pause size={18} strokeWidth={2.5} />
          ) : (
            <Play size={18} strokeWidth={2.5} />
          )}
        </button>

        <button
          onClick={() => seekToTime(Math.min(duration, currentTime + 10))}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <SkipForward size={16} />
        </button>

        <span
          className="text-xs ml-1"
          style={{ color: "var(--text-muted)", fontFamily: "JetBrains Mono" }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {/* Volume */}
          <button
            onClick={() => {
              setMuted(!muted);
              videoRef.current.muted = !muted;
            }}
            className="p-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Speed */}
          <select
            value={speed}
            onChange={(e) => changeSpeed(parseFloat(e.target.value))}
            className="text-xs rounded-lg px-2 py-1"
            style={{
              background: "var(--ink-600)",
              color: "var(--text-muted)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
