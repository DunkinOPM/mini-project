import { useState } from "react";
import { Lightbulb, Film, FileText, Loader2, ArrowRight } from "lucide-react";
import { recommend as apiRecommend } from "../utils/api";

export default function Recommendations({
  analytics = {},
  currentTime = 0,
  onSeek,
}) {
  const [recs, setRecs] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [concept, setConcept] = useState("");

  const fetch = async (c) => {
    setLoading(true);
    try {
      const { data } = await apiRecommend({
        concept: c || undefined,
        timestamp: currentTime,
      });
      setRecs(data.recommendations || []);
      setResources(data.resources || []);
    } catch {
      setResources([]);
    }
    setLoading(false);
  };

  const difficulties = analytics?.difficult_segments || [];
  const insights = analytics?.insights || [];

  return (
    <div className="flex flex-col gap-5">
      {/* Insights */}
      {insights.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--ink-700)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            className="text-xs font-semibold mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            AI INSIGHTS
          </p>
          <div className="flex flex-col gap-2">
            {insights.map((ins, i) => (
              <p
                key={i}
                className="text-sm"
                style={{ color: "var(--text-primary)", lineHeight: 1.6 }}
              >
                {ins}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Difficult segments quick links */}
      {difficulties.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            REVIEW DIFFICULT SEGMENTS
          </p>
          <div className="flex flex-col gap-2">
            {difficulties.slice(0, 3).map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  onSeek && onSeek(d.start);
                  fetch(d.primary_concept);
                }}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-white/5"
                style={{
                  background: "var(--ink-700)",
                  border: "1px solid rgba(255,107,107,0.15)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,107,107,0.1)" }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: "var(--coral)" }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {d.primary_concept}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {d.timestamp} · Score: {d.confusion_score}
                  </p>
                </div>
                <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom concept search */}
      <div>
        <p
          className="text-xs font-semibold mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          GET RECOMMENDATIONS FOR
        </p>
        <div className="flex gap-2">
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetch(concept)}
            placeholder="Enter a concept..."
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: "var(--ink-700)",
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.07)",
              fontFamily: "DM Sans",
            }}
          />
          <button
            onClick={() => fetch(concept)}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{
              background: "rgba(200,241,53,0.12)",
              color: "var(--acid)",
              border: "1px solid rgba(200,241,53,0.2)",
            }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Lightbulb size={14} />
            )}
            {loading ? "" : "Find"}
          </button>
        </div>
      </div>

      {/* Results */}
      {resources.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            LEARN MORE
          </p>
          <div className="flex flex-col gap-2">
            {resources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between gap-3 p-3 rounded-xl transition-all hover:bg-white/5"
                style={{
                  background: "var(--ink-700)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {res.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {res.type === "youtube" ? "YouTube" : "Web search"}
                  </p>
                </div>
                <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="flex flex-col gap-2 animate-fade-in">
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            RECOMMENDED ({recs.length})
          </p>
          {recs.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
              style={{
                background: "var(--ink-700)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
              onClick={() => r.start !== undefined && onSeek && onSeek(r.start)}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    r.type === "slide"
                      ? "rgba(78,205,196,0.1)"
                      : "rgba(200,241,53,0.1)",
                }}
              >
                {r.type === "slide" ? (
                  <FileText size={14} style={{ color: "var(--sky)" }} />
                ) : (
                  <Film size={14} style={{ color: "var(--acid)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.title || r.timestamp || "Segment"}
                </p>
                <p
                  className="text-xs mt-0.5 line-clamp-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {r.text || r.reason}
                </p>
              </div>
              <span
                className="text-xs flex-shrink-0 font-mono"
                style={{ color: "var(--acid)" }}
              >
                {Math.round(r.score * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading &&
        recs.length === 0 &&
        difficulties.length === 0 &&
        insights.length === 0 && (
          <div
            className="text-center py-10"
            style={{ color: "var(--text-muted)" }}
          >
            <Lightbulb size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Process content to get recommendations</p>
          </div>
        )}
    </div>
  );
}
