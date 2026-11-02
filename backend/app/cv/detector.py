"""YOLO detector wrapper with graceful fallback to mock mode."""

import logging
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

_YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO as _YOLO  # type: ignore
    _YOLO_AVAILABLE = True
except Exception as exc:
    logger.warning(f"ultralytics unavailable ({exc}). Detector in mock mode.")


class Detector:
    """
    YOLO vehicle detector wrapper.
    Falls back to mock detections if ultralytics is not available.
    """

    VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
    CONFIDENCE_THRESHOLD = 0.45

    def __init__(self, model_path: str = "yolov8n.pt"):
        self.model_path = model_path
        self.mock_mode = not _YOLO_AVAILABLE
        self._model = None
        if not self.mock_mode:
            try:
                self._model = _YOLO(model_path)
                logger.info(f"Detector: YOLO model loaded from {model_path}")
            except Exception as e:
                logger.warning(f"YOLO load failed: {e}. Switching to mock mode.")
                self.mock_mode = True

    def detect(self, frame: Optional[np.ndarray]) -> list[dict]:
        """Run detection on a frame. Returns list of detection dicts."""
        if self.mock_mode or frame is None:
            return self._mock_detections(frame)
        return self._real_detections(frame)

    def _real_detections(self, frame: np.ndarray) -> list[dict]:
        results = self._model(frame, verbose=False)
        dets = []
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in self.VEHICLE_CLASS_IDS:
                    continue
                conf = float(box.conf[0])
                if conf < self.CONFIDENCE_THRESHOLD:
                    continue
                xyxy = box.xyxy[0].tolist()
                dets.append({
                    "class": self.VEHICLE_CLASS_IDS[cls_id],
                    "bbox": xyxy,
                    "confidence": round(conf, 2),
                })
        return dets

    def _mock_detections(self, frame: Optional[np.ndarray]) -> list[dict]:
        """Generate random mock detections."""
        import random
        n = random.randint(0, 8)
        dets = []
        for _ in range(n):
            x1 = random.uniform(0.05, 0.8)
            y1 = random.uniform(0.05, 0.8)
            dets.append({
                "class": random.choice(list(self.VEHICLE_CLASS_IDS.values())),
                "bbox": [x1, y1, x1 + 0.1, y1 + 0.08],
                "confidence": round(random.uniform(0.5, 0.99), 2),
            })
        return dets
