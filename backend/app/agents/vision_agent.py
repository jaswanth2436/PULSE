"""Vision agent for vehicle detection and tracking."""

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

from app.cv.tracker import IOUTracker

logger = logging.getLogger(__name__)

# Try to import ultralytics YOLOv8
_YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO as _YOLO  # type: ignore
    _YOLO_AVAILABLE = True
    logger.info("ultralytics YOLO available - using real detection mode")
except Exception as exc:
    logger.warning(f"ultralytics not available ({exc}). Vision agent running in mock mode.")


@dataclass
class VehicleDetection:
    id: str
    vehicle_class: str
    bbox: list[float]
    approach: str
    confidence: float
    is_queued: bool = False
    crossed_line: bool = False
    wait_time: float = 0.0


class VisionAgent:
    """
    Vehicle detection and tracking agent.

    In real mode: runs YOLOv8n inference on video frames.
    If YOLO is unavailable, returns no detections instead of fabricating data.
    Uses IOUTracker for stable IDs across frames.
    """

    VEHICLE_CLASSES = ["car", "motorcycle", "bus", "truck"]
    APPROACHES = ["north", "south", "east", "west"]

    def __init__(self, model_path: str = "yolov8n.pt", mock_mode: bool | None = None):
        self.model_path = model_path
        self._model = None
        self.tracker = IOUTracker()
        self._time = 0.0
        self.mock_mode = False
        self.model_available = False

        if _YOLO_AVAILABLE and mock_mode is not True:
            self._load_model()
            self.model_available = self._model is not None

    def _load_model(self):
        """Load YOLO model."""
        try:
            self._model = _YOLO(self.model_path)
            logger.info(f"YOLO model loaded from {self.model_path}")
        except Exception as exc:
            logger.error("Failed to load YOLO model: %s", exc)
            self._model = None

    def detect(
        self,
        frame: Optional[np.ndarray] = None,
        queue_params: Optional[dict[str, int]] = None,
        approach_rois: Optional[dict[str, list]] = None,
        current_time: float | None = None,
    ) -> list[VehicleDetection]:
        """Run detection + IOU tracking on a frame."""
        if current_time is not None:
            self._time = current_time
        else:
            self._time += 1.0

        raw = self._real_detect_raw(frame, approach_rois or {}) if frame is not None else []

        # Normalize bboxes to [0,1] for tracker consistency when using pixel coords
        tracks = self.tracker.update(raw, current_time=self._time)
        detections: list[VehicleDetection] = []
        for tr in tracks:
            detections.append(
                VehicleDetection(
                    id=tr.track_id,
                    vehicle_class=tr.class_name,
                    bbox=tr.bbox,
                    approach=tr.approach,
                    confidence=tr.confidence,
                    is_queued=tr.is_queued,
                    crossed_line=tr.crossed_line,
                    wait_time=round(max(0.0, self._time - tr.first_seen), 1),
                )
            )
        return detections

    def _real_detect_raw(
        self, frame: np.ndarray, approach_rois: dict[str, list]
    ) -> list[dict]:
        """Run actual YOLO inference; return raw dicts for tracker."""
        if self._model is None:
            return []

        results = self._model(frame, verbose=False)
        detections: list[dict] = []
        vehicle_class_ids = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
        h, w = frame.shape[:2]

        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in vehicle_class_ids:
                    continue
                xyxy = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                if conf < 0.45:
                    continue
                # Normalize to 0-1 for tracker / ROI logic
                norm = [xyxy[0] / w, xyxy[1] / h, xyxy[2] / w, xyxy[3] / h]
                cx = (xyxy[0] + xyxy[2]) / 2
                cy = (xyxy[1] + xyxy[3]) / 2
                approach = self._assign_approach(cx, cy, approach_rois, frame.shape)
                detections.append({
                    "class": vehicle_class_ids[cls_id],
                    "bbox": norm,
                    "confidence": round(conf, 2),
                    "approach": approach,
                })
        return detections

    def _assign_approach(
        self,
        cx: float,
        cy: float,
        rois: dict[str, list],
        frame_shape: tuple,
    ) -> str:
        """Assign a detection to an approach based on its center position."""
        if rois:
            for approach, polygon in rois.items():
                if self._point_in_polygon(cx, cy, polygon):
                    return approach
        # Fallback: quadrant-based
        h, w = frame_shape[:2]
        if cx < w / 2 and cy < h / 2:
            return "north"
        elif cx >= w / 2 and cy < h / 2:
            return "east"
        elif cx < w / 2 and cy >= h / 2:
            return "south"
        return "west"

    @staticmethod
    def _point_in_polygon(x: float, y: float, polygon: list) -> bool:
        """Ray casting algorithm for point-in-polygon."""
        n = len(polygon)
        inside = False
        px, py = x, y
        j = n - 1
        for i in range(n):
            xi, yi = polygon[i]
            xj, yj = polygon[j]
            if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
        return inside
