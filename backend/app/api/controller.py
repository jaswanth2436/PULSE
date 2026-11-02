"""Signal controller endpoints."""

from fastapi import APIRouter
from app.schemas.signal import ControllerModeRequest, OptimizeRequest, SignalPlanRequest
from app.agents.orchestrator import orchestrator
from app.services.traffic_service import (
    get_intent, get_current_traffic_state, set_current_plan,
    get_controller_mode, set_controller_mode as set_mode, add_alert,
)

router = APIRouter(tags=["controller"])

_controller_state = {
    "controller_type": "pulse",
    "active_phase": "PHASE_1",
    "phase_remaining": 30.0,
    "cycle_count": 0,
    "total_served": 0,
    "efficiency": 0.0,
}


@router.get("/status")
async def controller_status():
    traffic = get_current_traffic_state()
    _controller_state["controller_type"] = get_controller_mode()
    _controller_state["active_phase"] = traffic.get("phase", "PHASE_1")
    _controller_state["phase_remaining"] = traffic.get("phaseRemaining", 0.0)
    return {**_controller_state, "source": traffic.get("source", "none")}


@router.post("/mode")
async def set_controller_mode(req: ControllerModeRequest):
    set_mode(req.mode)
    _controller_state["controller_type"] = req.mode
    add_alert("info", f"Controller mode set to {req.mode}", "controller")
    return {"status": "ok", "mode": req.mode}


@router.post("/optimize")
async def optimize_signal(req: OptimizeRequest):
    """Run PULSE optimizer and return a signal plan."""
    intent = get_intent()
    traffic = get_current_traffic_state()

    queues = req.approach_queues or {
        k: v["queued"] for k, v in traffic["approaches"].items()
    }
    waits = req.approach_waits or {
        k: v["avgWait"] for k, v in traffic["approaches"].items()
    }
    intent_weights = req.intent_weights or {
        "priorities": intent["priorities"],
        "efficiency_weight": intent["efficiencyWeight"],
        "fairness_weight": intent["fairnessWeight"],
        "priority_weight": intent["priorityWeight"],
        "protected_crossings": intent.get("protectedCrossings", []),
    }

    result = orchestrator.optimize_signal(
        queue_sizes=queues,
        waiting_times=waits,
        intent=intent_weights,
    )
    # Apply protected crossing check if present
    crossings = intent.get("protectedCrossings") or intent_weights.get("protected_crossings") or []
    if crossings:
        from app.agents.safety_agent import SafetyAgent
        safety = SafetyAgent().validate(result.get("phases", []), protected_crossings=crossings)
        result["safety_valid"] = safety.valid
        result["violations"] = safety.violations
        if not safety.valid:
            result["explanation"] = safety.explanation

    set_current_plan(result)
    _controller_state["cycle_count"] += 1
    return result


@router.post("/validate")
async def validate_plan(req: SignalPlanRequest):
    """Validate a signal plan against safety constraints."""
    plan_dict = {
        "phases": [p.model_dump() for p in req.phase_durations]
    }
    intent = get_intent()
    result = orchestrator.validate_plan(plan_dict)
    crossings = intent.get("protectedCrossings") or []
    if crossings:
        from app.agents.safety_agent import SafetyAgent
        safety = SafetyAgent().validate(plan_dict["phases"], protected_crossings=crossings)
        result = {"valid": safety.valid, "violations": safety.violations, "explanation": safety.explanation}
    return result
