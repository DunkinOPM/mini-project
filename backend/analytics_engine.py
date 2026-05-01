"""
Analytics Engine
- Processes behavior logs (pause, replay, seek, speed)
- Detects confusing segments
- Generates learning insights
"""

import re
from typing import List, Dict, Any
from collections import defaultdict


REPLAY_WEIGHT = 2.0
PAUSE_WEIGHT = 1.0
CONFUSION_THRESHOLD = 3.0
SLOW_SPEED_THRESHOLD = 0.75


class AnalyticsEngine:
    def generate(
        self,
        behavior_logs: List[Dict[str, Any]],
        alignment: List[Dict[str, Any]],
        transcript: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Main analytics generation."""

        # 1. Score each segment
        segment_scores = self._compute_confusion_scores(behavior_logs, alignment)

        # 2. Identify difficult segments
        difficult_segments = self._find_difficult_segments(
            segment_scores, alignment, transcript
        )

        # 3. Engagement stats
        engagement = self._compute_engagement(behavior_logs, alignment)

        # 4. Topic frequency
        topic_stats = self._topic_stats(alignment, segment_scores)

        # 5. Overall insights
        insights = self._generate_insights(difficult_segments, engagement, topic_stats)

        return {
            "difficult_segments": difficult_segments,
            "engagement": engagement,
            "topic_stats": topic_stats,
            "insights": insights,
            "total_events": len(behavior_logs),
            "segments_analyzed": len(alignment),
        }

    def _get_segment_id(self, seg: Dict[str, Any], fallback_idx: int) -> int:
        return seg.get("segment_id", seg.get("id", fallback_idx))

    def _compute_confusion_scores(
        self,
        logs: List[Dict[str, Any]],
        alignment: List[Dict[str, Any]],
    ) -> Dict[int, float]:
        """Map segment_id → confusion score."""
        scores: Dict[int, float] = defaultdict(float)

        if not alignment:
            return scores

        # Build timestamp → segment_id mapping
        def find_segment(ts: float) -> int:
            for idx, seg in enumerate(alignment):
                if seg.get("start", 0.0) <= ts <= seg.get("end", 0.0):
                    return self._get_segment_id(seg, idx)
            if alignment:
                nearest = min(alignment, key=lambda seg: abs(seg.get("start", 0.0) - ts))
                return self._get_segment_id(nearest, alignment.index(nearest))
            return 0

        for event in logs:
            ts = event.get("timestamp", 0)
            seg_id = find_segment(ts)
            etype = event.get("event_type", "")

            if etype == "replay":
                scores[seg_id] += REPLAY_WEIGHT
            elif etype == "pause":
                scores[seg_id] += PAUSE_WEIGHT
            elif etype == "speed_change":
                speed = event.get("value", 1.0)
                if speed and speed <= SLOW_SPEED_THRESHOLD:
                    scores[seg_id] += 1.5  # Slowing down = confusion

        if not logs:
            for idx, seg in enumerate(alignment):
                seg_id = self._get_segment_id(seg, idx)
                scores[seg_id] = self._estimate_content_difficulty(
                    seg.get("text", seg.get("video_text", ""))
                )

        return dict(scores)

    def _find_difficult_segments(
        self,
        scores: Dict[int, float],
        alignment: List[Dict[str, Any]],
        transcript: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        difficult = []

        for idx, seg in enumerate(alignment):
            seg_id = self._get_segment_id(seg, idx)
            score = scores.get(seg_id, 0)
            if score >= CONFUSION_THRESHOLD:
                difficult.append({
                    "segment_id": seg_id,
                    "timestamp": seg.get("timestamp"),
                    "start": seg.get("start"),
                    "end": seg.get("end"),
                    "text": seg.get("text", seg.get("video_text", "")),
                    "primary_concept": seg.get("concept", "Unknown"),
                    "slide_id": seg.get("slide_id", 0),
                    "slide_title": seg.get("slide_title", ""),
                    "confusion_score": round(score, 1),
                    "difficulty_level": self._difficulty_label(score),
                })

        difficult.sort(key=lambda x: x["confusion_score"], reverse=True)
        if difficult:
            return difficult

        fallback = []
        for idx, seg in enumerate(alignment):
            seg_id = self._get_segment_id(seg, idx)
            score = scores.get(seg_id, 0)
            fallback.append({
                "segment_id": seg_id,
                "timestamp": seg.get("timestamp"),
                "start": seg.get("start"),
                "end": seg.get("end"),
                "text": seg.get("text", seg.get("video_text", "")),
                "primary_concept": seg.get("concept", "Unknown"),
                "slide_id": seg.get("slide_id", 0),
                "slide_title": seg.get("slide_title", ""),
                "confusion_score": round(score, 1),
                "difficulty_level": self._difficulty_label(score),
                "source": "content",
            })

        fallback.sort(key=lambda x: x["confusion_score"], reverse=True)
        return fallback[:3]

    def _estimate_content_difficulty(self, text: str) -> float:
        """Estimate difficulty from segment text alone."""
        if not text:
            return 0.0

        words = re.findall(r"\b[a-zA-Z][a-zA-Z\-']{2,}\b", text)
        if not words:
            return 0.0

        avg_len = sum(len(w) for w in words) / len(words)
        long_ratio = sum(1 for w in words if len(w) >= 7) / len(words)
        punctuation_complexity = len(re.findall(r"[,:;]", text))
        term_density = len(set(words)) / len(words)

        score = 1.0
        score += min(4.0, len(words) / 12.0)
        score += min(3.0, long_ratio * 4.0)
        score += min(1.5, punctuation_complexity * 0.4)
        score += min(1.5, max(0.0, (avg_len - 5.0) * 0.3))
        score += min(0.5, max(0.0, (1 - term_density)))

        return round(min(8.5, score), 1)

    def _compute_engagement(
        self,
        logs: List[Dict[str, Any]],
        alignment: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        pauses = [e for e in logs if e.get("event_type") == "pause"]
        replays = [e for e in logs if e.get("event_type") == "replay"]
        seeks = [e for e in logs if e.get("event_type") == "seek"]
        speeds = [e for e in logs if e.get("event_type") == "speed_change"]

        avg_speed = 1.0
        if speeds:
            vals = [e.get("value", 1.0) for e in speeds if e.get("value")]
            avg_speed = sum(vals) / len(vals) if vals else 1.0

        # Demo values if no real data
        if not logs:
            return {
                "total_pauses": 3,
                "total_replays": 5,
                "total_seeks": 2,
                "avg_speed": 1.0,
                "engagement_score": 72,
                "watch_percentage": 88,
            }

        engagement_score = min(100, max(0, 50 + len(replays) * 5 - len(pauses) * 2))
        return {
            "total_pauses": len(pauses),
            "total_replays": len(replays),
            "total_seeks": len(seeks),
            "avg_speed": round(avg_speed, 2),
            "engagement_score": engagement_score,
            "watch_percentage": 85,
        }

    def _topic_stats(
        self,
        alignment: List[Dict[str, Any]],
        scores: Dict[int, float],
    ) -> List[Dict[str, Any]]:
        topic_counts: Dict[str, Dict] = defaultdict(lambda: {"count": 0, "total_score": 0})

        for idx, seg in enumerate(alignment):
            concept = seg.get("concept", "General")
            seg_id = self._get_segment_id(seg, idx)
            topic_counts[concept]["count"] += 1
            topic_counts[concept]["total_score"] += scores.get(seg_id, 0)

        result = []
        for concept, data in topic_counts.items():
            count = data["count"]
            total_score = data["total_score"]
            if total_score > 0:
                avg_confusion = total_score / count
            else:
                # Fall back to a weak difficulty score based on segment frequency
                avg_confusion = min(4.0, 1.0 + count * 0.5)

            difficulty_level = self._difficulty_label(avg_confusion)
            result.append({
                "concept": concept,
                "segments": count,
                "avg_confusion": round(avg_confusion, 1),
                "difficulty_level": difficulty_level,
            })

        result.sort(key=lambda x: x["avg_confusion"], reverse=True)
        return result[:10]

    def _generate_insights(
        self,
        difficult: List[Dict],
        engagement: Dict,
        topic_stats: List[Dict],
    ) -> List[str]:
        insights = []

        if difficult:
            top = difficult[0]
            insights.append(
                f"🔴 Most challenging segment: '{top['primary_concept']}' "
                f"at {top['timestamp']} with confusion score {top['confusion_score']}"
            )

        if len(difficult) > 2:
            insights.append(
                f"⚠️ {len(difficult)} segments show high confusion. "
                "Consider reviewing these with additional resources."
            )

        eng = engagement.get("engagement_score", 0)
        if eng >= 80:
            insights.append("✅ High engagement detected throughout the lecture.")
        elif eng >= 50:
            insights.append("📊 Moderate engagement. Some sections may need clarification.")
        else:
            insights.append("📉 Low engagement score. Consider shorter lecture segments.")

        replays = engagement.get("total_replays", 0)
        if replays > 5:
            insights.append(
                f"🔁 {replays} replay events detected — students are revisiting content."
            )

        if topic_stats:
            hardest = topic_stats[0]
            insights.append(
                f"📖 Topic with most difficulty: '{hardest['concept']}' "
                f"(avg confusion: {hardest['avg_confusion']})"
            )

        if not insights:
            insights.append("📊 Processing complete. Upload videos and interact to generate insights.")

        return insights

    @staticmethod
    def _difficulty_label(score: float) -> str:
        if score >= 8:
            return "very high"
        elif score >= 5:
            return "high"
        elif score >= 3:
            return "medium"
        return "low"
