"""Unit tests for PULSE — no server startup required."""
import pytest
from app.schemas.simulation import SimulationConfig
from app.simulation.intersection import IntersectionSimulator
from app.controllers.fixed_timing import FixedTimingController
from app.controllers.queue_adaptive import QueueAdaptiveController
from app.controllers.pulse_controller import PULSEController
from app.agents.safety_agent import SafetyAgent
from app.agents.demand_agent import DemandAgent
from app.agents.vision_agent import VehicleDetection


# ─── Controller Tests ─────────────────────────────────────────────────────────

def test_fixed_controller_produces_constant_durations():
    ctrl = FixedTimingController(phase_durations={"PHASE_1": 30.0, "PHASE_2": 30.0})
    d1 = ctrl.compute_phase_durations(
        queue_sizes={"north": 5, "south": 3, "east": 2, "west": 1},
        waiting_times={"north": 20, "south": 10, "east": 5, "west": 3},
    )
    d2 = ctrl.compute_phase_durations(
        queue_sizes={"north": 20, "south": 20, "east": 0, "west": 0},
        waiting_times={"north": 100, "south": 100, "east": 0, "west": 0},
    )
    assert d1["PHASE_1"] == d2["PHASE_1"] == 30.0
    assert d1["PHASE_2"] == d2["PHASE_2"] == 30.0


def test_adaptive_controller_more_green_for_congested():
    ctrl = QueueAdaptiveController(min_green=10, max_green=60)
    durations = ctrl.compute_phase_durations(
        queue_sizes={"north": 20, "south": 15, "east": 2, "west": 1},
        waiting_times={"north": 60, "south": 40, "east": 5, "west": 5},
    )
    assert durations["PHASE_1"] > durations["PHASE_2"]


def test_pulse_controller_respects_bounds():
    ctrl = PULSEController(min_green=10, max_green=60)
    durations = ctrl.compute_phase_durations(
        queue_sizes={"north": 5, "south": 5, "east": 5, "west": 5},
        waiting_times={"north": 10, "south": 10, "east": 10, "west": 10},
    )
    for phase, duration in durations.items():
        assert 10.0 <= duration <= 60.0, f"{phase} = {duration}s out of [10,60]"


def test_pulse_controller_priority_effect():
    """High north priority → PHASE_1 (N-S) gets more green."""
    ctrl_high = PULSEController(
        priorities={"north": 5.0, "south": 5.0, "east": 1.0, "west": 1.0},
        priority_weight=0.8, efficiency_weight=0.1, fairness_weight=0.1,
    )
    durations = ctrl_high.compute_phase_durations(
        queue_sizes={"north": 3, "south": 3, "east": 3, "west": 3},
        waiting_times={"north": 10, "south": 10, "east": 10, "west": 10},
    )
    assert durations["PHASE_1"] >= durations["PHASE_2"]


# ─── Simulation Tests ─────────────────────────────────────────────────────────

def test_simulation_reproducibility():
    cfg = SimulationConfig(duration=300, seed=42)
    r1 = IntersectionSimulator(cfg, controller=FixedTimingController()).run()
    r2 = IntersectionSimulator(cfg, controller=FixedTimingController()).run()
    assert r1.vehicles_served == r2.vehicles_served
    assert r1.avg_delay == r2.avg_delay


def test_simulation_produces_positive_throughput():
    cfg = SimulationConfig(duration=600, seed=42)
    result = IntersectionSimulator(cfg, controller=PULSEController()).run()
    assert result.vehicles_served > 0
    assert result.throughput > 0


def test_simulation_high_demand_causes_queues():
    cfg = SimulationConfig(
        duration=300, seed=42, service_rate=0.1,
        arrival_rates={"north": 1200.0, "south": 1200.0, "east": 1200.0, "west": 1200.0},
    )
    result = IntersectionSimulator(cfg, controller=FixedTimingController()).run()
    assert result.max_queue > 5


def test_simulation_time_series_recorded():
    cfg = SimulationConfig(duration=120, seed=42)
    result = IntersectionSimulator(cfg, controller=FixedTimingController()).run()
    assert len(result.time_series) > 0


def test_pulse_vs_fixed_different_results():
    """PULSE and Fixed should produce different outcomes (different green allocation)."""
    cfg = SimulationConfig(
        duration=600, seed=42,
        arrival_rates={"north": 600.0, "south": 100.0, "east": 100.0, "west": 100.0},
    )
    r_fixed = IntersectionSimulator(cfg, controller=FixedTimingController()).run()
    ctrl_p = PULSEController(
        priorities={"north": 5.0, "south": 1.0, "east": 1.0, "west": 1.0},
        priority_weight=0.5,
    )
    r_pulse = IntersectionSimulator(cfg, controller=ctrl_p).run()
    # They should differ (PULSE adapts to heavy north load)
    assert r_fixed.avg_delay != r_pulse.avg_delay or r_fixed.vehicles_served != r_pulse.vehicles_served


def test_all_three_controllers_same_seed():
    """Three controllers on same seed — verify deterministic arrival."""
    cfg = SimulationConfig(duration=180, seed=77)
    results = [
        IntersectionSimulator(cfg, controller=FixedTimingController()).run(),
        IntersectionSimulator(cfg, controller=QueueAdaptiveController()).run(),
        IntersectionSimulator(cfg, controller=PULSEController()).run(),
    ]
    # All should complete without error
    assert all(r.vehicles_served >= 0 for r in results)
    assert all(r.safety_violations == 0 for r in results)


# ─── Safety Agent Tests ────────────────────────────────────────────────────────

def valid_plan():
    return [
        {"phase": "PHASE_1", "approaches": ["north","south"], "green_duration": 30.0, "yellow_duration": 3.0, "all_red_duration": 2.0},
        {"phase": "PHASE_2", "approaches": ["east","west"], "green_duration": 30.0, "yellow_duration": 3.0, "all_red_duration": 2.0},
    ]


def test_safety_accepts_valid_plan():
    result = SafetyAgent().validate(valid_plan())
    assert result.valid is True
    assert result.violations == []


def test_safety_rejects_short_green():
    plan = valid_plan(); plan[0]["green_duration"] = 5.0
    result = SafetyAgent().validate(plan)
    assert result.valid is False
    assert any("green" in v.lower() for v in result.violations)


def test_safety_rejects_short_yellow():
    plan = valid_plan(); plan[0]["yellow_duration"] = 1.5
    result = SafetyAgent().validate(plan)
    assert result.valid is False


def test_safety_rejects_excessive_green():
    plan = valid_plan(); plan[0]["green_duration"] = 100.0
    result = SafetyAgent().validate(plan)
    assert result.valid is False


def test_safety_borderline_values_valid():
    plan = [
        {"phase": "PHASE_1", "approaches": ["north","south"], "green_duration": 10.0, "yellow_duration": 3.0, "all_red_duration": 2.0},
        {"phase": "PHASE_2", "approaches": ["east","west"], "green_duration": 90.0, "yellow_duration": 3.0, "all_red_duration": 2.0},
    ]
    assert SafetyAgent().validate(plan).valid is True


# ─── Demand Agent Tests ───────────────────────────────────────────────────────

def test_demand_agent_counts_queued_correctly():
    agent = DemandAgent()
    dets = {"north": [
        VehicleDetection(id="v1", vehicle_class="car", bbox=[0,0,50,50], approach="north", confidence=0.9, is_queued=True),
        VehicleDetection(id="v2", vehicle_class="car", bbox=[60,0,110,50], approach="north", confidence=0.85, is_queued=True),
        VehicleDetection(id="v3", vehicle_class="bus", bbox=[120,0,200,80], approach="north", confidence=0.8, is_queued=False),
    ]}
    result = agent.update(detections_by_approach=dets, current_time=10.0)
    north = next(a for a in result.approaches if a.approach == "north")
    assert north.vehicle_count == 3
    assert north.queue_count == 2


def test_demand_agent_empty_detection():
    agent = DemandAgent()
    result = agent.update(detections_by_approach={}, current_time=0.0)
    assert result.total_vehicles == 0
    assert all(a.queue_count == 0 for a in result.approaches)


# ─── Queue Calculation Tests ──────────────────────────────────────────────────

def test_queue_normalization():
    ctrl = PULSEController()
    values = {"north": 0.0, "south": 5.0, "east": 10.0, "west": 5.0}
    norm = ctrl._normalize(values)
    assert norm["north"] == 0.0
    assert norm["east"] == 1.0
    assert 0.0 <= norm["south"] <= 1.0


def test_fairness_boost_prevents_starvation():
    """Approach waiting > threshold should get max green."""
    ctrl = PULSEController(min_green=10, max_green=60, max_wait_threshold=30)
    durations = ctrl.compute_phase_durations(
        queue_sizes={"north": 0, "south": 0, "east": 5, "west": 5},
        waiting_times={"north": 0, "south": 0, "east": 100.0, "west": 80.0},
        current_time=200.0,
    )
    # East+West are in PHASE_2 and starved → should get max_green
    assert durations["PHASE_2"] == 60.0
