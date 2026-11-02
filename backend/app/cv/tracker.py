"""Lightweight IOU multi-object tracker for CPU-only vehicle tracking."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
import uuid


@dataclass
class Track:
    track_id: str
    bbox: list[float]
    class_name: str
    approach: str
    confidence: float
    age: int = 1
    hits: int = 1
    missed: int = 0
    first_seen: float = 0.0
    last_seen: float = 0.0
    crossed_line: bool = False
    is_queued: bool = True


def _iou(a: list[float], b: list[float]) -> float:
    """Intersection-over-union for [x1,y1,x2,y2] boxes (normalized or pixel)."""
    x1 = max(a[0], b[0])
    y1 = max(a[1], b[1])
    x2 = min(a[2], b[2])
    y2 = min(a[3], b[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if inter <= 0:
        return 0.0
    area_a = max(0.0, a[2] - a[0]) * max(0.0, a[3] - a[1])
    area_b = max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def _center(bbox: list[float]) -> tuple[float, float]:
    return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)


class IOUTracker:
    """
    Greedy IOU tracker with stop-line crossing detection.
    Suitable for CPU-only demo when ByteTrack/ultralytics tracker unavailable.
    """

    def __init__(
        self,
        iou_threshold: float = 0.3,
        max_missed: int = 15,
        stop_lines: Optional[dict[str, float]] = None,
    ):
        self.iou_threshold = iou_threshold
        self.max_missed = max_missed
        # stop_lines: approach -> normalized y (or x) threshold toward intersection
        self.stop_lines = stop_lines or {
            "north": 0.55,
            "south": 0.45,
            "east": 0.45,
            "west": 0.55,
        }
        self.tracks: dict[str, Track] = {}
        self._frame_idx = 0

    def update(
        self,
        detections: list[dict],
        current_time: float = 0.0,
    ) -> list[Track]:
        """
        Match detections to existing tracks.
        Each detection dict: {bbox, class, confidence, approach}
        """
        self._frame_idx += 1
        track_ids = list(self.tracks.keys())
        unmatched_tracks = set(track_ids)
        unmatched_dets = set(range(len(detections)))
        matches: list[tuple[str, int]] = []

        # Score matrix greedily
        pairs: list[tuple[float, str, int]] = []
        for tid in track_ids:
            for di, det in enumerate(detections):
                score = _iou(self.tracks[tid].bbox, det["bbox"])
                if score >= self.iou_threshold:
                    pairs.append((score, tid, di))
        pairs.sort(reverse=True)

        used_t, used_d = set(), set()
        for score, tid, di in pairs:
            if tid in used_t or di in used_d:
                continue
            matches.append((tid, di))
            used_t.add(tid)
            used_d.add(di)
            unmatched_tracks.discard(tid)
            unmatched_dets.discard(di)

        # Update matched
        for tid, di in matches:
            det = detections[di]
            tr = self.tracks[tid]
            prev_center = _center(tr.bbox)
            new_center = _center(det["bbox"])
            tr.bbox = list(det["bbox"])
            tr.class_name = det.get("class", tr.class_name)
            tr.confidence = float(det.get("confidence", tr.confidence))
            tr.approach = det.get("approach", tr.approach)
            tr.age += 1
            tr.hits += 1
            tr.missed = 0
            tr.last_seen = current_time
            if self._crossed_stop_line(tr.approach, prev_center, new_center):
                tr.crossed_line = True
                tr.is_queued = False
            else:
                tr.is_queued = not tr.crossed_line

        # Create new tracks
        for di in unmatched_dets:
            det = detections[di]
            tid = str(uuid.uuid4())[:8]
            self.tracks[tid] = Track(
                track_id=tid,
                bbox=list(det["bbox"]),
                class_name=det.get("class", "car"),
                approach=det.get("approach", "north"),
                confidence=float(det.get("confidence", 0.5)),
                first_seen=current_time,
                last_seen=current_time,
                is_queued=True,
            )

        # Age unmatched tracks
        to_delete = []
        for tid in unmatched_tracks:
            tr = self.tracks[tid]
            tr.missed += 1
            tr.age += 1
            if tr.missed > self.max_missed:
                to_delete.append(tid)
        for tid in to_delete:
            del self.tracks[tid]

        return list(self.tracks.values())

    def _crossed_stop_line(
        self, approach: str, prev: tuple[float, float], curr: tuple[float, float]
    ) -> bool:
        """Heuristic: vehicle center moves past stop-line toward intersection center."""
        line = self.stop_lines.get(approach, 0.5)
        px, py = prev
        cx, cy = curr
        if approach == "north":
            return py < line <= cy  # moving downward past line
        if approach == "south":
            return py > line >= cy
        if approach == "east":
            return px > line >= cx
        if approach == "west":
            return px < line <= cx
        return False

    def waiting_times(self, current_time: float) -> dict[str, float]:
        """Max track age (as wait proxy) per approach for queued vehicles."""
        waits = {"north": 0.0, "south": 0.0, "east": 0.0, "west": 0.0}
        for tr in self.tracks.values():
            if not tr.is_queued:
                continue
            wait = max(0.0, current_time - tr.first_seen)
            if wait > waits.get(tr.approach, 0.0):
                waits[tr.approach] = wait
        return waits
