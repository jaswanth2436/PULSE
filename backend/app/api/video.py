"""Video upload and processing pipeline."""

import asyncio
import os
import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks

from app.config import settings
from app.services.traffic_service import (
    add_alert, update_traffic_from_simulation, append_traffic_history,
    get_intent, get_controller_mode,
)

logger = logging.getLogger("pulse.video")
router = APIRouter(tags=["video"])

_video_state = {
    "status": "idle",
    "filename": None,
    "filepath": None,
    "is_playing": False,
    "fps": 0.0,
    "frame_count": 0,
    "current_frame": 0,
    "duration": 0.0,
    "source": "none",
    "detector_mode": "mock",
    "last_detections": 0,
}

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_SIZE_BYTES = 500 * 1024 * 1024
_process_task: asyncio.Task | None = None
_stop_flag = False
_pause_flag = False


def get_video_state() -> dict:
    return dict(_video_state)


async def _process_video_loop(filepath: str):
    """Decode video with OpenCV, run detection/tracking, push traffic state."""
    global _stop_flag, _pause_flag
    _stop_flag = False
    _pause_flag = False

    try:
        import cv2
    except Exception as e:
        logger.error(f"OpenCV unavailable: {e}")
        _video_state.update({"status": "error", "is_playing": False})
        add_alert("critical", f"OpenCV unavailable: {e}", "video")
        return

    from app.agents.orchestrator import orchestrator
    from app.cv.tracker import IOUTracker

    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        _video_state.update({"status": "error", "is_playing": False})
        add_alert("critical", "Could not open video file", "video")
        return

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 15.0)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total_frames / fps if fps > 0 else 0.0
    detector_mode = "mock" if orchestrator.vision.mock_mode else "yolo"
    _video_state.update({
        "fps": round(fps, 2),
        "frame_count": total_frames,
        "duration": round(duration, 2),
        "status": "playing",
        "is_playing": True,
        "detector_mode": detector_mode,
        "source": "video",
    })
    add_alert("info", f"Video processing started ({detector_mode} detector)", "video")

    tracker = IOUTracker()
    frame_idx = 0
    process_every = max(1, int(fps // 5) or 1)  # ~5 Hz analysis
    t0 = time.perf_counter()
    processed = 0

    try:
        while not _stop_flag:
            if _pause_flag:
                _video_state["status"] = "paused"
                _video_state["is_playing"] = False
                await asyncio.sleep(0.1)
                continue

            _video_state["status"] = "playing"
            _video_state["is_playing"] = True

            # Run blocking read in thread pool
            ret, frame = await asyncio.to_thread(cap.read)
            if not ret:
                break

            frame_idx += 1
            _video_state["current_frame"] = frame_idx
            current_time = frame_idx / fps if fps else float(frame_idx)

            if frame_idx % process_every != 0:
                await asyncio.sleep(0)  # yield
                continue

            intent = get_intent()
            intent_weights = {
                "efficiency": intent.get("efficiencyWeight", 0.4),
                "fairness": intent.get("fairnessWeight", 0.4),
                "priority": intent.get("priorityWeight", 0.2),
                "efficiency_weight": intent.get("efficiencyWeight", 0.4),
                "fairness_weight": intent.get("fairnessWeight", 0.4),
                "priority_weight": intent.get("priorityWeight", 0.2),
                "priorities": {k: float(v) for k, v in intent.get("priorities", {}).items()},
            }

            # Detect (may be mock if no YOLO)
            result = await asyncio.to_thread(
                orchestrator.process_frame,
                frame,
                None,
                None,
                current_time,
                get_controller_mode(),
                intent_weights,
            )

            # Track with stable IDs
            raw_dets = []
            for d in result.get("detections", []):
                # process_frame returns slim dets; recover bbox via vision re-detect is heavy —
                # use approach-bucketed synthetic boxes when mock, or include bbox if present
                bbox = d.get("bbox") or [0.1, 0.1, 0.2, 0.2]
                raw_dets.append({
                    "bbox": bbox,
                    "class": d.get("class", "car"),
                    "confidence": d.get("confidence", 0.5),
                    "approach": d.get("approach", "north"),
                })

            # Enrich with full vision detections that include bboxes
            vision_dets = await asyncio.to_thread(
                orchestrator.vision.detect, frame, None, None
            )
            raw_dets = [
                {
                    "bbox": vd.bbox,
                    "class": vd.vehicle_class,
                    "confidence": vd.confidence,
                    "approach": vd.approach,
                }
                for vd in vision_dets
            ]
            tracks = tracker.update(raw_dets, current_time=current_time)
            waits = tracker.waiting_times(current_time)

            approaches_live = {}
            for approach in ("north", "south", "east", "west"):
                approach_tracks = [t for t in tracks if t.approach == approach]
                queued = [t for t in approach_tracks if t.is_queued]
                max_wait = waits.get(approach, 0.0)
                avg_wait = (sum(max(0.0, current_time - t.first_seen) for t in queued) / len(queued)) if queued else 0.0
                demand = result.get("demand", {}).get(approach, {})
                approaches_live[approach] = {
                    "vehicles": len(approach_tracks) or demand.get("vehicles", 0),
                    "queued": len(queued) or demand.get("queue", 0),
                    "avg_wait": avg_wait or demand.get("avg_wait", 0.0),
                    "max_wait": max_wait or demand.get("max_wait", 0.0),
                    "signal": "GREEN" if approach in ("north", "south") else "RED",
                }

            elapsed = time.perf_counter() - t0
            processed += 1
            proc_fps = processed / elapsed if elapsed > 0 else 0.0

            update_traffic_from_simulation({
                "approaches": approaches_live,
                "controller": get_controller_mode(),
                "phase": result.get("plan", {}).get("controller", "PHASE_1"),
                "phase_remaining": 0.0,
                "source": "video",
                "model_status": detector_mode,
                "video_status": "playing",
                "fps": round(proc_fps, 1),
                "detections": [
                    {
                        "id": t.track_id,
                        "class": t.class_name,
                        "approach": t.approach,
                        "confidence": t.confidence,
                        "is_queued": t.is_queued,
                        "crossed_line": t.crossed_line,
                        "wait": round(max(0.0, current_time - t.first_seen), 1),
                    }
                    for t in tracks
                ],
            })
            append_traffic_history({
                "t": current_time,
                "frame": frame_idx,
                "queues": {a: approaches_live[a]["queued"] for a in approaches_live},
                "source": "video",
                "detector": detector_mode,
            })
            _video_state["last_detections"] = len(tracks)
            _video_state["fps"] = round(proc_fps, 1)

            # Pace roughly to video time / 2 for demo responsiveness
            await asyncio.sleep(max(0.01, process_every / max(fps, 1.0) * 0.5))

        _video_state.update({"status": "finished" if not _stop_flag else "stopped", "is_playing": False})
        update_traffic_from_simulation({"video_status": _video_state["status"], "source": "video"})
        add_alert("info", "Video processing finished", "video")
    except Exception as e:
        logger.exception("Video processing error")
        _video_state.update({"status": "error", "is_playing": False})
        add_alert("critical", f"Video error: {e}", "video")
    finally:
        cap.release()


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}")

    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = os.path.basename(file.filename or f"upload_{int(time.time())}{ext}")
    filepath = os.path.join(upload_dir, safe_name)

    try:
        with open(filepath, "wb") as f:
            total = 0
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_SIZE_BYTES:
                    raise HTTPException(413, "File too large (max 500 MB)")
                f.write(chunk)
    except HTTPException:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise

    # Probe metadata
    fps, frame_count, duration = 0.0, 0, 0.0
    try:
        import cv2
        cap = cv2.VideoCapture(filepath)
        if cap.isOpened():
            fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            duration = frame_count / fps if fps > 0 else 0.0
            cap.release()
    except Exception:
        pass

    from app.agents.orchestrator import orchestrator
    _video_state.update({
        "status": "ready",
        "filename": safe_name,
        "filepath": filepath,
        "source": "video",
        "fps": round(fps, 2),
        "frame_count": frame_count,
        "duration": round(duration, 2),
        "current_frame": 0,
        "is_playing": False,
        "detector_mode": "mock" if orchestrator.vision.mock_mode else "yolo",
    })
    add_alert("info", f"Video uploaded: {safe_name}", "video")
    return {
        "status": "uploaded",
        "filename": safe_name,
        "path": filepath,
        "fps": _video_state["fps"],
        "frame_count": frame_count,
        "duration": _video_state["duration"],
        "detector_mode": _video_state["detector_mode"],
        "source": "video",
    }


@router.post("/start")
async def start_video(background_tasks: BackgroundTasks):
    global _process_task, _stop_flag, _pause_flag
    if _video_state["filepath"] is None:
        raise HTTPException(400, "No video loaded. Upload a video first.")
    if _video_state.get("is_playing"):
        return {"status": "already_playing"}

    _stop_flag = False
    _pause_flag = False
    background_tasks.add_task(_process_video_loop, _video_state["filepath"])
    _video_state["status"] = "playing"
    _video_state["is_playing"] = True
    add_alert("info", "Video processing started", "video")
    return {"status": "playing", "source": "video", "detector_mode": _video_state.get("detector_mode")}


@router.post("/pause")
async def pause_video():
    global _pause_flag
    _pause_flag = True
    _video_state["is_playing"] = False
    _video_state["status"] = "paused"
    return {"status": "paused"}


@router.post("/stop")
async def stop_video():
    global _stop_flag, _pause_flag
    _stop_flag = True
    _pause_flag = False
    _video_state["is_playing"] = False
    _video_state["status"] = "stopped"
    add_alert("info", "Video processing stopped", "video")
    return {"status": "stopped"}


@router.get("/status")
async def video_status():
    return get_video_state()
