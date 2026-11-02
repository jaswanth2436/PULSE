"""Agent orchestrator - coordinates all PULSE agents."""

import logging
from typing import Optional

from app.agents.vision_agent import VisionAgent
from app.agents.demand_agent import DemandAgent, DemandEstimate
from app.agents.strategy_agent import StrategyAgent, SignalPlan
from app.agents.safety_agent import SafetyAgent

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Coordinates all PULSE agents in the processing pipeline:
    1. VisionAgent - detect vehicles
    2. DemandAgent - estimate queues/waits
    3. StrategyAgent - generate signal plan
    4. SafetyAgent - validate plan
    """

    def __init__(self, model_path: str = "yolov8n.pt", mock_mode: bool = False):
        self.vision = VisionAgent(model_path=model_path, mock_mode=mock_mode)
        self.demand = DemandAgent()
        self.safety = SafetyAgent()
        self.strategy = StrategyAgent(safety_agent=self.safety)
        self._current_plan: Optional[SignalPlan] = None
        self._current_demand: Optional[DemandEstimate] = None
        logger.info(
            f"AgentOrchestrator initialized "
            f"(vision mode: {'mock' if self.vision.mock_mode else 'real'})"
        )

    def process_frame(
        self,
        frame=None,
        queue_params: Optional[dict] = None,
        approach_rois: Optional[dict] = None,
        current_time: float = 0.0,
        controller_type: str = "pulse",
        intent_weights: Optional[dict] = None,
    ) -> dict:
        """Run full agent pipeline on a frame."""
        # Step 1: Detect + track vehicles
        detections = self.vision.detect(
            frame=frame,
            queue_params=queue_params,
            approach_rois=approach_rois,
            current_time=current_time,
        )

        # Step 2: Group by approach
        detections_by_approach = {}
        for det in detections:
            detections_by_approach.setdefault(det.approach, []).append(det)

        # Step 3: Estimate demand
        self._current_demand = self.demand.update(
            detections_by_approach=detections_by_approach,
            current_time=current_time,
        )

        # Step 4: Generate signal plan
        queue_sizes = {
            d.approach: d.queue_count for d in self._current_demand.approaches
        }
        waiting_times = {
            d.approach: d.max_wait for d in self._current_demand.approaches
        }
        self._current_plan = self.strategy.generate_plan(
            controller_type=controller_type,
            queue_sizes=queue_sizes,
            waiting_times=waiting_times,
            current_time=current_time,
            intent_weights=intent_weights,
        )

        return {
            "detections": [
                {
                    "id": d.id,
                    "class": d.vehicle_class,
                    "approach": d.approach,
                    "confidence": d.confidence,
                    "is_queued": d.is_queued,
                    "crossed_line": d.crossed_line,
                    "bbox": d.bbox,
                    "wait_time": getattr(d, "wait_time", 0.0),
                }
                for d in detections
            ],
            "demand": {
                a.approach: {
                    "queue": a.queue_count,
                    "vehicles": a.vehicle_count,
                    "avg_wait": a.avg_wait,
                    "max_wait": a.max_wait,
                }
                for a in self._current_demand.approaches
            },
            "plan": {
                "phases": self._current_plan.phase_durations,
                "controller": self._current_plan.controller_type,
                "safety_valid": self._current_plan.safety_result.valid
                if self._current_plan.safety_result
                else True,
            },
            "total_vehicles": self._current_demand.total_vehicles,
            "system_saturation": self._current_demand.system_saturation,
        }

    def optimize_signal(
        self,
        queue_sizes: dict,
        waiting_times: dict,
        intent: Optional[dict] = None,
    ) -> dict:
        """Run PULSE optimizer and return a validated signal plan dict."""
        from app.controllers.pulse_controller import PULSEController
        from app.simulation.signal_phases import PHASE_APPROACHES

        intent = intent or {}
        priorities_raw = intent.get("priorities", {})
        # Convert 1-5 scale to float
        priorities = {k: float(v) for k, v in priorities_raw.items()}

        ctrl = PULSEController(
            efficiency_weight=intent.get("efficiency_weight", 0.4),
            fairness_weight=intent.get("fairness_weight", 0.4),
            priority_weight=intent.get("priority_weight", 0.2),
            priorities=priorities,
        )
        durations = ctrl.compute_phase_durations(
            queue_sizes=queue_sizes,
            waiting_times=waiting_times,
        )

        phases = []
        for phase_name, green in durations.items():
            approaches = PHASE_APPROACHES.get(phase_name, [])
            phases.append({
                "phase": phase_name,
                "approaches": approaches,
                "green_duration": round(green, 1),
                "yellow_duration": 3.0,
                "all_red_duration": 2.0,
            })

        # Safety validation
        safety = self.safety.validate(phases)

        # Estimate delay
        total_q = sum(queue_sizes.values())
        cycle = sum(p["green_duration"] + p["yellow_duration"] + p["all_red_duration"] for p in phases)
        est_delay = round(cycle * 0.4 + total_q * 0.5, 1)

        # Build explanation
        dominant = max(durations, key=durations.get)
        dominant_approaches = PHASE_APPROACHES.get(dominant, [])
        explanation = (
            f"PULSE allocated more green time to {dominant} ({durations[dominant]:.0f}s) "
            f"based on queue pressure ({queue_sizes}) and user priorities. "
            f"{'Safety validated.' if safety.valid else 'Safety violations detected.'}"
        )

        return {
            "phases": phases,
            "cycle_time": round(cycle, 1),
            "safety_valid": safety.valid,
            "violations": safety.violations,
            "explanation": explanation,
            "estimated_delay": est_delay,
            "weights_used": {
                "efficiency": intent.get("efficiency_weight", 0.4),
                "fairness": intent.get("fairness_weight", 0.4),
                "priority": intent.get("priority_weight", 0.2),
            },
        }

    def validate_plan(self, plan: dict) -> dict:
        """Validate a signal plan dict."""
        phases = plan.get("phases", [])
        safety = self.safety.validate(phases)
        return {
            "valid": safety.valid,
            "violations": safety.violations,
            "explanation": safety.explanation,
        }

    def evaluate_plan(self, plan: dict, queue_sizes: dict, waiting_times: dict) -> dict:
        """Evaluate a plan's estimated performance."""
        phases = plan.get("phases", [])
        safety = self.safety.validate(phases)
        cycle = sum(
            p.get("green_duration", 30) + p.get("yellow_duration", 3) + p.get("all_red_duration", 2)
            for p in phases
        )
        total_q = sum(queue_sizes.values())
        est_delay = round(cycle * 0.4 + total_q * 0.5, 1)
        return {
            "phases": phases,
            "cycle_time": round(cycle, 1),
            "estimated_delay": est_delay,
            "safety_valid": safety.valid,
            "violations": safety.violations,
        }


def _build_default_orchestrator() -> AgentOrchestrator:
    import os
    force_mock = os.environ.get("USE_MOCK_DETECTOR", "false").lower() in ("1", "true", "yes")
    try:
        from app.config import settings
        path = getattr(settings, "yolo_weights_path", "yolov8n.pt")
        force_mock = force_mock or bool(getattr(settings, "use_mock_detector", False))
    except Exception:
        path = "yolov8n.pt"
    return AgentOrchestrator(model_path=path, mock_mode=force_mock)


# Singleton — defaults to mock for CPU/offline demos; set USE_MOCK_DETECTOR=false for YOLO
orchestrator = _build_default_orchestrator()
