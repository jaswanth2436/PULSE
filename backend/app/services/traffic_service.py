"""PULSE Traffic State Service - in-memory global state."""

import threading
from collections import deque
from datetime import datetime, timezone
from typing import Optional

_lock = threading.Lock()

# Global mutable traffic state
_state = {
    "vehicles": 0,
    "avgWait": 0.0,
    "maxQueue": 0,
    "controller": "pulse",
    "phase": "PHASE_1",
    "phaseRemaining": 30.0,
    "approaches": {
        "north": {"name": "North", "vehicles": 0, "queued": 0, "avgWait": 0.0, "maxWait": 0.0, "signal": "GREEN", "severity": "normal"},
        "south": {"name": "South", "vehicles": 0, "queued": 0, "avgWait": 0.0, "maxWait": 0.0, "signal": "RED", "severity": "normal"},
        "east":  {"name": "East",  "vehicles": 0, "queued": 0, "avgWait": 0.0, "maxWait": 0.0, "signal": "RED", "severity": "normal"},
        "west":  {"name": "West",  "vehicles": 0, "queued": 0, "avgWait": 0.0, "maxWait": 0.0, "signal": "RED", "severity": "normal"},
    },
    "alerts": [],
    "fps": 0.0,
    "modelStatus": "offline",
    "videoStatus": "idle",
    "source": "none",  # simulation | video | webcam | none
    "detections": [],
    "timestamp": datetime.now(timezone.utc).isoformat(),
}

# Rolling history for charts / /traffic/history
_history: deque = deque(maxlen=500)

# Current intent profile
_intent = {
    "priorities": {"north": 3, "south": 3, "east": 3, "west": 3},
    "efficiencyWeight": 0.4,
    "fairnessWeight": 0.4,
    "priorityWeight": 0.2,
    "protectedCrossings": [],
}

# Current optimized plan
_current_plan: Optional[dict] = None

# Demo state machine
_demo_state = {
    "active": False,
    "current_step": 0,
    "steps_completed": [],
    "last_result": None,
}

# Simulation live state
_sim_live = {
    "is_running": False,
    "progress": 0.0,
    "current_time": 0.0,
    "total_time": 0.0,
    "controller_type": "pulse",
    "scenario": None,
    "results": None,
    "source": "simulation",
}

# Active controller mode (wired to optimize/sim)
_controller_mode = "pulse"


def get_current_traffic_state() -> dict:
    with _lock:
        _state["timestamp"] = datetime.now(timezone.utc).isoformat()
        return dict(_state)


def update_traffic_from_simulation(sim_state: dict):
    """Update live traffic state from simulation or video pipeline step data."""
    with _lock:
        approaches = sim_state.get("approaches", {})
        for approach, data in approaches.items():
            if approach in _state["approaches"]:
                a = _state["approaches"][approach]
                a["vehicles"] = data.get("vehicles", 0)
                a["queued"] = data.get("queued", 0)
                a["avgWait"] = round(data.get("avg_wait", data.get("avgWait", 0.0)), 1)
                a["maxWait"] = round(data.get("max_wait", data.get("maxWait", 0.0)), 1)
                a["signal"] = data.get("signal", a.get("signal", "RED"))
                q = a["queued"]
                a["severity"] = "critical" if q > 15 else "high" if q > 8 else "elevated" if q > 4 else "normal"

        total_q = sum(a["queued"] for a in _state["approaches"].values())
        total_v = sum(a["vehicles"] for a in _state["approaches"].values())
        all_waits = [a["avgWait"] for a in _state["approaches"].values()]
        _state["vehicles"] = total_v
        _state["maxQueue"] = total_q
        _state["avgWait"] = round(sum(all_waits) / len(all_waits), 1) if all_waits else 0.0
        _state["controller"] = sim_state.get("controller", _state["controller"])
        _state["phase"] = sim_state.get("phase", _state["phase"])
        _state["phaseRemaining"] = sim_state.get("phase_remaining", sim_state.get("phaseRemaining", 0.0))
        if "source" in sim_state:
            _state["source"] = sim_state["source"]
        if "model_status" in sim_state:
            _state["modelStatus"] = sim_state["model_status"]
        if "video_status" in sim_state:
            _state["videoStatus"] = sim_state["video_status"]
        if "fps" in sim_state:
            _state["fps"] = sim_state["fps"]
        if "detections" in sim_state:
            _state["detections"] = sim_state["detections"]


def append_traffic_history(point: dict):
    with _lock:
        entry = dict(point)
        entry.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        _history.append(entry)


def get_traffic_history(limit: int = 100) -> list:
    with _lock:
        items = list(_history)
    return items[-limit:]


def get_intent() -> dict:
    with _lock:
        return dict(_intent)


def update_intent(new_intent: dict):
    with _lock:
        _intent.update(new_intent)


def get_current_plan() -> Optional[dict]:
    with _lock:
        return _current_plan


def set_current_plan(plan: dict):
    global _current_plan
    with _lock:
        _current_plan = plan


def get_sim_live_state() -> dict:
    with _lock:
        return dict(_sim_live)


def update_sim_live_state(update: dict):
    with _lock:
        _sim_live.update(update)


def get_demo_state() -> dict:
    with _lock:
        return dict(_demo_state)


def update_demo_state(update: dict):
    with _lock:
        _demo_state.update(update)


def get_controller_mode() -> str:
    with _lock:
        return _controller_mode


def set_controller_mode(mode: str):
    global _controller_mode
    with _lock:
        _controller_mode = mode
        _state["controller"] = mode


def add_alert(level: str, message: str, category: str = "system"):
    with _lock:
        alert = {
            "id": f"alert_{len(_state['alerts'])}_{int(datetime.now().timestamp())}",
            "level": level,
            "message": message,
            "category": category,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _state["alerts"].insert(0, alert)
        _state["alerts"] = _state["alerts"][:20]
