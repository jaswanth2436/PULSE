"""Guided Demo state machine — executes real PULSE actions per step."""

import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.traffic_service import (
    get_demo_state, update_demo_state, add_alert, update_intent,
    set_controller_mode, get_current_traffic_state, set_current_plan,
)

logger = logging.getLogger("pulse.demo")
router = APIRouter(tags=["demo"])

DEMO_STEPS = [
    {"step": 1, "title": "Load Intersection", "description": "Initialize the PULSE four-way intersection with default configuration.", "action": "load_intersection"},
    {"step": 2, "title": "Start Traffic Source", "description": "Begin simulation mode with Scenario A (Balanced Traffic).", "action": "start_simulation"},
    {"step": 3, "title": "Vehicle Detection", "description": "Observe vehicle detection and tracking across all four approaches.", "action": "show_detection"},
    {"step": 4, "title": "Lane-wise Queues", "description": "Inspect per-approach queue lengths and waiting time estimates.", "action": "show_queues"},
    {"step": 5, "title": "Fixed Timing Baseline", "description": "Run the fixed-cycle controller (30s N-S / 30s E-W) as baseline.", "action": "run_fixed"},
    {"step": 6, "title": "Queue-Adaptive Controller", "description": "Run the queue-pressure adaptive controller on identical traffic.", "action": "run_adaptive"},
    {"step": 7, "title": "Set Traffic Priority", "description": "Use Intent Studio to raise North approach priority to Critical (5).", "action": "set_priority"},
    {"step": 8, "title": "Run PULSE Controller", "description": "Generate an optimized signal plan using your intent preferences.", "action": "run_pulse"},
    {"step": 9, "title": "Safety Validation", "description": "Review the Safety Agent's validation of the proposed signal plan.", "action": "validate_safety"},
    {"step": 10, "title": "Performance Comparison", "description": "Compare all three controllers on average delay, queue, and throughput.", "action": "show_comparison"},
    {"step": 11, "title": "Export Report", "description": "Generate and export the experiment report as CSV.", "action": "export_report"},
]

# Cache last experiment ids for export step
_demo_cache: dict = {"experiment_ids": [], "comparison": None, "plan": None, "csv": None}


async def _execute_action(action: str) -> dict:
    """Map demo action strings to real backend operations."""
    from app.schemas.simulation import SimulationConfig
    from app.services.experiment_service import _build_simulator
    from app.agents.orchestrator import orchestrator
    from app.agents.safety_agent import SafetyAgent

    result: dict = {"action": action, "ok": True}

    if action == "load_intersection":
        set_controller_mode("pulse")
        update_intent({
            "priorities": {"north": 3, "south": 3, "east": 3, "west": 3},
            "efficiencyWeight": 0.4,
            "fairnessWeight": 0.4,
            "priorityWeight": 0.2,
            "protectedCrossings": [],
        })
        result["message"] = "Intersection loaded with default four-way configuration."
        result["navigate"] = "/intersection"

    elif action == "start_simulation":
        # Short live-feeling run for demo responsiveness
        cfg = SimulationConfig(scenario="A", duration=120, seed=42, controller_type="pulse")
        from app.simulation.scenarios import SCENARIOS
        base = SCENARIOS["A"].model_dump()
        base.update({"duration": 120, "controller_type": "pulse", "scenario": "A", "seed": 42})
        cfg = SimulationConfig(**base)
        sim = _build_simulator(cfg)
        sim_result = sim.run()
        # Push final queues into live state
        from app.services.traffic_service import update_traffic_from_simulation, update_sim_live_state
        approaches_live = {}
        for a, q in (sim_result.time_series[-1].queues if sim_result.time_series else {}).items():
            approaches_live[a] = {
                "vehicles": q, "queued": q, "avg_wait": sim_result.approach_delays.get(a, 0),
                "max_wait": sim_result.approach_delays.get(a, 0) * 1.5, "signal": "GREEN" if a in ("north", "south") else "RED",
            }
        if not approaches_live:
            for a in ("north", "south", "east", "west"):
                approaches_live[a] = {
                    "vehicles": 3, "queued": 3, "avg_wait": 12.0, "max_wait": 20.0,
                    "signal": "GREEN" if a in ("north", "south") else "RED",
                }
        update_traffic_from_simulation({
            "approaches": approaches_live,
            "controller": "pulse",
            "phase": "PHASE_1",
            "phase_remaining": 20.0,
            "source": "simulation",
            "model_status": "simulation",
        })
        update_sim_live_state({
            "is_running": False, "progress": 1.0, "results": sim_result.model_dump(exclude={"time_series"}),
            "scenario": "A", "controller_type": "pulse",
        })
        result["message"] = f"Scenario A complete — served {sim_result.vehicles_served} vehicles, avg delay {sim_result.avg_delay}s."
        result["metrics"] = {"avg_delay": sim_result.avg_delay, "throughput": sim_result.throughput}
        result["navigate"] = "/intersection"
        result["source"] = "simulation"

    elif action == "show_detection":
        traffic = get_current_traffic_state()
        result["message"] = f"Detection active — {traffic.get('vehicles', 0)} vehicles across approaches (source: {traffic.get('source', 'simulation')})."
        result["approaches"] = traffic.get("approaches", {})
        result["navigate"] = "/intersection"
        result["source"] = traffic.get("source", "simulation")

    elif action == "show_queues":
        traffic = get_current_traffic_state()
        queues = {k: v.get("queued", 0) for k, v in traffic.get("approaches", {}).items()}
        waits = {k: v.get("avgWait", 0) for k, v in traffic.get("approaches", {}).items()}
        result["message"] = f"Queues: {queues}. Avg waits: {waits}."
        result["queues"] = queues
        result["waits"] = waits
        result["navigate"] = "/intersection"

    elif action in ("run_fixed", "run_adaptive", "run_pulse"):
        ctrl = action.replace("run_", "")
        if ctrl == "pulse":
            ctrl = "pulse"
        set_controller_mode(ctrl if ctrl != "fixed" else "fixed")
        mode = {"run_fixed": "fixed", "run_adaptive": "adaptive", "run_pulse": "pulse"}[action]
        set_controller_mode(mode)
        cfg = SimulationConfig(scenario="A", duration=300, seed=42, controller_type=mode)
        from app.simulation.scenarios import SCENARIOS
        base = SCENARIOS["A"].model_dump()
        base.update({"duration": 300, "controller_type": mode, "scenario": "A", "seed": 42})
        if mode == "pulse":
            base["intent_weights"] = {
                "efficiency_weight": 0.3, "fairness_weight": 0.2, "priority_weight": 0.5,
                "priorities": {"north": 5.0, "south": 3.0, "east": 2.0, "west": 2.0},
            }
        cfg = SimulationConfig(**base)
        sim = _build_simulator(cfg)
        sim_result = sim.run()
        metrics = sim_result.model_dump(exclude={"time_series"})
        _demo_cache.setdefault("runs", {})[mode] = metrics
        result["message"] = f"{mode} controller: avg delay {sim_result.avg_delay}s, throughput {sim_result.throughput} veh/hr."
        result["metrics"] = metrics
        result["controller"] = mode
        result["navigate"] = "/performance-lab"
        result["source"] = "simulation"

    elif action == "set_priority":
        update_intent({
            "priorities": {"north": 5, "south": 3, "east": 2, "west": 2},
            "efficiencyWeight": 0.3,
            "fairnessWeight": 0.2,
            "priorityWeight": 0.5,
        })
        result["message"] = "North priority set to Critical (5). Weights: efficiency 0.3, fairness 0.2, priority 0.5."
        result["navigate"] = "/intent-studio"
        result["intent"] = {
            "priorities": {"north": 5, "south": 3, "east": 2, "west": 2},
        }

    elif action == "run_pulse":
        # Handled above in run_* branch — keep for clarity
        pass

    elif action == "validate_safety":
        traffic = get_current_traffic_state()
        queues = {k: v.get("queued", 3) for k, v in traffic.get("approaches", {}).items()}
        waits = {k: v.get("avgWait", 10) for k, v in traffic.get("approaches", {}).items()}
        plan = orchestrator.optimize_signal(
            queue_sizes=queues or {"north": 8, "south": 4, "east": 3, "west": 2},
            waiting_times=waits or {"north": 40, "south": 15, "east": 10, "west": 8},
            intent={
                "priorities": {"north": 5, "south": 3, "east": 2, "west": 2},
                "efficiency_weight": 0.3,
                "fairness_weight": 0.2,
                "priority_weight": 0.5,
            },
        )
        set_current_plan(plan)
        _demo_cache["plan"] = plan
        safety = SafetyAgent().validate(plan.get("phases", []))
        result["message"] = safety.explanation
        result["plan"] = plan
        result["safety"] = {"valid": safety.valid, "violations": safety.violations}
        result["navigate"] = "/intent-studio"

    elif action == "show_comparison":
        # Ensure we have all three runs
        runs = _demo_cache.get("runs", {})
        for mode in ("fixed", "adaptive", "pulse"):
            if mode not in runs:
                cfg_dict = {
                    "scenario": "A", "duration": 300, "seed": 42, "controller_type": mode,
                    "arrival_rates": {"north": 300.0, "south": 300.0, "east": 300.0, "west": 300.0},
                }
                if mode == "pulse":
                    cfg_dict["intent_weights"] = {
                        "efficiency_weight": 0.3, "fairness_weight": 0.2, "priority_weight": 0.5,
                        "priorities": {"north": 5.0, "south": 3.0, "east": 2.0, "west": 2.0},
                    }
                cfg = SimulationConfig(**cfg_dict)
                runs[mode] = _build_simulator(cfg).run().model_dump(exclude={"time_series"})
        _demo_cache["runs"] = runs
        _demo_cache["comparison"] = runs
        result["message"] = (
            f"Comparison — Fixed delay {runs['fixed']['avg_delay']}s | "
            f"Adaptive {runs['adaptive']['avg_delay']}s | PULSE {runs['pulse']['avg_delay']}s"
        )
        result["comparison"] = runs
        result["navigate"] = "/performance-lab"
        result["source"] = "simulation"

    elif action == "export_report":
        from app.services.report_service import build_comparison_csv
        comparison = _demo_cache.get("comparison") or _demo_cache.get("runs") or {}
        if not comparison:
            # Quick fallback run
            await _execute_action("show_comparison")
            comparison = _demo_cache.get("comparison") or {}
        csv_text = build_comparison_csv(comparison, scenario="A", seed=42)
        _demo_cache["csv"] = csv_text
        result["message"] = "CSV report generated. Open Reports page or download from response."
        result["csv_preview"] = "\n".join(csv_text.splitlines()[:12])
        result["csv"] = csv_text
        result["navigate"] = "/reports"

    else:
        result["ok"] = False
        result["message"] = f"Unknown action: {action}"

    return result


@router.post("/start")
async def start_demo():
    update_demo_state({"active": True, "current_step": 1, "steps_completed": [], "last_result": None})
    _demo_cache.clear()
    _demo_cache["runs"] = {}
    add_alert("info", "Guided demo started — Step 1: Load Intersection", "demo")
    return {"status": "started", "current_step": 1, "steps": DEMO_STEPS}


@router.get("/status")
async def demo_status():
    state = get_demo_state()
    return {"demo_state": state, "steps": DEMO_STEPS, "cache_keys": list(_demo_cache.keys())}


@router.post("/step/{step_num}")
async def advance_demo_step(step_num: int):
    if step_num < 1 or step_num > len(DEMO_STEPS):
        raise HTTPException(400, f"Invalid step {step_num}. Must be 1-{len(DEMO_STEPS)}")

    step_info = DEMO_STEPS[step_num - 1]
    try:
        action_result = await _execute_action(step_info["action"])
    except Exception as e:
        logger.exception("Demo step failed")
        raise HTTPException(500, f"Demo step {step_num} failed: {e}")

    state = get_demo_state()
    completed = list(state.get("steps_completed", []))
    if step_num not in completed:
        completed.append(step_num)
    next_step = step_num + 1 if step_num < len(DEMO_STEPS) else step_num
    update_demo_state({
        "current_step": next_step,
        "steps_completed": completed,
        "last_result": action_result,
    })
    add_alert("info", f"Demo step {step_num} completed: {step_info['title']}", "demo")
    return {
        "completed_step": step_num,
        "next_step": next_step,
        "is_final": step_num == len(DEMO_STEPS),
        "step_info": step_info,
        "result": action_result,
    }


@router.post("/reset")
async def reset_demo():
    update_demo_state({"active": False, "current_step": 0, "steps_completed": [], "last_result": None})
    _demo_cache.clear()
    return {"status": "reset"}


@router.get("/steps")
async def get_demo_steps():
    return {"steps": DEMO_STEPS, "total": len(DEMO_STEPS)}
