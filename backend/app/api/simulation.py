"""Simulation control endpoints."""

import asyncio
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.simulation import SimulationConfig
from app.services.traffic_service import (
    get_sim_live_state, update_sim_live_state, update_traffic_from_simulation,
    add_alert, append_traffic_history, get_controller_mode,
)
from app.simulation.scenarios import SCENARIOS, get_scenario

logger = logging.getLogger("pulse.simulation")
router = APIRouter(tags=["simulation"])


async def _run_simulation_async(config: SimulationConfig):
    """Run simulation in background with live telemetry updates and final results."""
    from app.services.experiment_service import _build_simulator
    from app.simulation.signal_phases import PHASE_APPROACHES, ALL_APPROACHES, SignalState

    update_sim_live_state({
        "is_running": True, "progress": 0.0, "current_time": 0.0,
        "total_time": float(config.duration), "controller_type": config.controller_type,
        "scenario": config.scenario, "results": None, "source": "simulation",
    })
    add_alert("info", f"Simulation started: {config.controller_type} / {config.scenario or 'custom'}", "simulation")

    try:
        sim = _build_simulator(config)
        total_steps = int(config.duration / sim.DT)
        all_queue_sums: list[float] = []
        max_queue = 0
        chunk = 10  # update UI every 10 simulated seconds

        for step in range(total_steps):
            if not get_sim_live_state()["is_running"]:
                break

            sim.t = step * sim.DT
            sim._generate_arrivals()
            if sim.phase.state == SignalState.GREEN:
                green_approaches = PHASE_APPROACHES.get(sim.phase.current_phase, [])
                sim._serve_vehicles(green_approaches)
            sim._advance_phase()
            sim._validate_phase_safety()
            total_q = sum(len(q) for q in sim.queues.values())
            all_queue_sums.append(float(total_q))
            if total_q > max_queue:
                max_queue = total_q
            sim._record_time_series()

            if step % chunk == 0 or step == total_steps - 1:
                signals = sim.phase.get_signals()
                approaches_live = {}
                for a in ALL_APPROACHES:
                    q_len = len(sim.queues[a])
                    max_wait = (sim.t - sim.queues[a][0].arrival_time) if sim.queues[a] else 0.0
                    approaches_live[a] = {
                        "vehicles": q_len,
                        "queued": q_len,
                        "avg_wait": max_wait / 2.0,
                        "max_wait": max_wait,
                        "signal": signals.get(a, "RED"),
                    }
                update_traffic_from_simulation({
                    "approaches": approaches_live,
                    "controller": config.controller_type,
                    "phase": sim.phase.current_phase,
                    "phase_remaining": max(0.0, sim.phase.phase_green_duration - sim.phase.time_in_state),
                    "source": "simulation",
                    "model_status": "simulation",
                    "video_status": "idle",
                    "fps": 0.0,
                })
                append_traffic_history({
                    "t": sim.t,
                    "queues": {a: len(sim.queues[a]) for a in ALL_APPROACHES},
                    "phase": sim.phase.current_phase,
                    "controller": config.controller_type,
                    "source": "simulation",
                })
                update_sim_live_state({
                    "progress": min(1.0, (step + 1) / total_steps),
                    "current_time": sim.t,
                })
                await asyncio.sleep(0.02)

        # Finalize metrics from accumulated state (do NOT call sim.run() again)
        import numpy as np
        delays = [v.delay for v in sim.served_vehicles]
        avg_delay = float(np.mean(delays)) if delays else 0.0
        p95_delay = float(np.percentile(delays, 95)) if delays else 0.0
        avg_queue = float(np.mean(all_queue_sums)) if all_queue_sums else 0.0
        elapsed = max(sim.t, 1.0)
        throughput = len(sim.served_vehicles) / (elapsed / 3600.0)
        approach_delays = {}
        for a in ALL_APPROACHES:
            veh = [v.delay for v in sim.served_vehicles if v.approach == a]
            approach_delays[a] = round(float(np.mean(veh)), 2) if veh else 0.0

        result = {
            "vehicles_served": len(sim.served_vehicles),
            "avg_delay": round(avg_delay, 2),
            "p95_delay": round(p95_delay, 2),
            "max_queue": max_queue,
            "avg_queue": round(avg_queue, 2),
            "throughput": round(throughput, 1),
            "approach_delays": approach_delays,
            "safety_violations": sim.safety_violations,
            "computation_time": 0.0,
            "controller_type": config.controller_type,
            "scenario": config.scenario,
            "seed": config.seed,
            "source": "simulation",
        }
        update_sim_live_state({
            "is_running": False,
            "progress": 1.0 if get_sim_live_state()["progress"] > 0.95 else get_sim_live_state()["progress"],
            "current_time": sim.t,
            "results": result,
        })
        add_alert("info", f"Simulation completed — avg delay {result['avg_delay']}s", "simulation")
    except asyncio.CancelledError:
        update_sim_live_state({"is_running": False})
    except Exception as e:
        logger.exception("Simulation error")
        update_sim_live_state({"is_running": False})
        add_alert("critical", f"Simulation error: {str(e)}", "simulation")


def _merge_scenario(config: SimulationConfig) -> SimulationConfig:
    """Apply named scenario defaults while preserving explicit request overrides."""
    if not config.scenario:
        return config
    if config.scenario not in SCENARIOS:
        # try alias resolution via get_scenario
        try:
            scenario_cfg = get_scenario(config.scenario)
        except ValueError:
            return config
    else:
        scenario_cfg = SCENARIOS[config.scenario]

    base = scenario_cfg.model_dump()
    # Prefer explicit request fields over scenario defaults when they differ from schema defaults
    req = config.model_dump()
    # Always take scenario arrival rates/seed/duration unless request set a custom short duration
    # Keep controller_type and intent_weights from request
    merged = {**base}
    merged["controller_type"] = config.controller_type
    merged["intent_weights"] = config.intent_weights
    merged["scenario"] = config.scenario
    # Allow shorter demo durations from the client
    if config.duration and config.duration != 3600:
        merged["duration"] = config.duration
    if config.seed is not None and req.get("seed") is not None:
        # Keep request seed if provided (including scenario default seed when matching)
        merged["seed"] = config.seed
    return SimulationConfig(**merged)


@router.post("/start")
async def start_simulation(config: SimulationConfig, background_tasks: BackgroundTasks):
    if get_sim_live_state()["is_running"]:
        raise HTTPException(409, "Simulation already running. Stop it first.")

    # Use active controller mode if request left default pulse and mode was set
    mode = get_controller_mode()
    if config.controller_type == "pulse" and mode in ("fixed", "adaptive", "pulse"):
        # Only override when client didn't explicitly change — keep request as source of truth
        pass
    if not config.controller_type:
        config = config.model_copy(update={"controller_type": mode})

    config = _merge_scenario(config)
    background_tasks.add_task(_run_simulation_async, config)
    return {"status": "started", "config": config.model_dump(), "source": "simulation"}


@router.post("/stop")
async def stop_simulation():
    update_sim_live_state({"is_running": False})
    add_alert("info", "Simulation stop requested", "simulation")
    return {"status": "stopped"}


@router.post("/reset")
async def reset_simulation():
    update_sim_live_state({
        "is_running": False, "progress": 0.0, "current_time": 0.0,
        "total_time": 0.0, "results": None,
    })
    return {"status": "reset"}


@router.get("/status")
async def simulation_status():
    return get_sim_live_state()


@router.get("/scenarios")
async def get_scenarios():
    details = {k: v.model_dump() for k, v in SCENARIOS.items()}
    return {"scenarios": list(SCENARIOS.keys()), "details": details}
