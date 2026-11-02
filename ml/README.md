# PULSE ML Module

## Detection Model

PULSE uses YOLOv8n (nano) from Ultralytics for vehicle detection.

### Model Details
- Architecture: YOLOv8 nano (optimized for speed)
- Input: Video frames (640×640 resized internally)
- Output: Bounding boxes, class labels, confidence scores
- Classes used: car (2), motorcycle (3), bus (5), truck (7) [COCO indices]
- Inference: CPU-only mode supported

### Download
The model weights are downloaded automatically on first use:
```python
from ultralytics import YOLO
model = YOLO('yolov8n.pt')  # Downloads automatically
```

Or manually:
```
cd backend/weights
curl -L https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt -o yolov8n.pt
```

### Mock Mode
When ultralytics is unavailable (e.g., Python 3.14 compatibility), PULSE uses a mock detector that generates synthetic detections based on simulation queue parameters.

Enable mock mode: Set USE_MOCK_DETECTOR=true in .env

## Queue Estimation

Queue classification logic:
1. Vehicle is detected in a stop-line region of interest
2. Vehicle speed estimate < speed_threshold (default: 5 km/h equivalent pixels/frame)
3. Vehicle has been in the ROI for > time_threshold frames

## Attribution
- YOLOv8: Jocher, G., et al. (2023). Ultralytics YOLOv8. https://github.com/ultralytics/ultralytics
- COCO dataset: Lin, T.Y., et al. (2014). Microsoft COCO: Common objects in context.
