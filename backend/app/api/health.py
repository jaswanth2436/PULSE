"""Health and system status endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter(tags=["health"])

START_TIME = datetime.now(timezone.utc)


def _detector_status() -> str:
    try:
        from app.agents.orchestrator import orchestrator
        return "mock" if orchestrator.vision.mock_mode else "yolo"
    except Exception:
        return "unknown"


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_status": _detector_status(),
    }


@router.get("/system/status")
async def system_status():
    uptime = (datetime.now(timezone.utc) - START_TIME).total_seconds()
    from app.services.traffic_service import get_current_traffic_state, get_sim_live_state
    traffic = get_current_traffic_state()
    sim = get_sim_live_state()
    return {
        "status": "running",
        "uptime_seconds": round(uptime, 1),
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "api": "ok",
            "database": "ok",
            "websocket": "ok",
            "detector": _detector_status(),
            "simulator": "running" if sim.get("is_running") else "ok",
        },
        "traffic_source": traffic.get("source", "none"),
        "video_status": traffic.get("videoStatus", "idle"),
    }
