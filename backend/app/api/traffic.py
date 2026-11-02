"""Traffic perception endpoints."""

from fastapi import APIRouter, Query
from app.services.traffic_service import get_current_traffic_state, get_traffic_history

router = APIRouter(tags=["traffic"])


@router.get("/current")
async def get_traffic_current():
    return get_current_traffic_state()


@router.get("/approaches")
async def get_traffic_approaches():
    state = get_current_traffic_state()
    return {"approaches": state["approaches"], "timestamp": state["timestamp"], "source": state.get("source")}


@router.get("/history")
async def traffic_history(limit: int = Query(default=100, ge=1, le=500)):
    history = get_traffic_history(limit=limit)
    state = get_current_traffic_state()
    return {
        "history": history,
        "count": len(history),
        "current": state,
        "source": state.get("source", "none"),
        "note": (
            "History populated during live simulation or video processing."
            if history
            else "No history yet — start a simulation or process a video."
        ),
    }
