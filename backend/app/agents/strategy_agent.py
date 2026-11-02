"""Strategy agent - generates optimal signal plans."""

import logging
from dataclasses import dataclass, field
from typing import Optional

from app.controllers.fixed_timing import FixedTimingController
from app.controllers.queue_adaptive import QueueAdaptiveController
from app.controllers.pulse_controller import PULSEController
from app.agents.safety_agent import SafetyAgent, SafetyResult
from app.simulation.signal_phases import PHASE_APPROACHES, ALL_APPROACHES

logger = logging.getLogger(__name__)


@dataclass
class SignalPlan:
    phase_durations: list[dict]
    controller_type: str
    safety_result: Optional[SafetyResult] = None
    score: float = 0.0


class StrategyAgent:
    """
    Generates signal plans using the selected controller and validates them.
    """

    def __init__(self, safety_agent: Optional[SafetyAgent] = None):
        self.safety_agent = safety_agent or SafetyAgent()

    def generate_plan(
        self,
        controller_type: str,
        queue_sizes: dict[str, int],
        waiting_times: dict[str, float],
        current_time: float = 0.0,
        intent_weights: Optional[dict] = None,
        priorities: Optional[dict] = None,
        min_green: int = 10,
        max_green: int = 60,
    ) -> SignalPlan:
        """Generate a signal plan for the given conditions."""
        if controller_type == "fixed":
            controller = FixedTimingController(min_green=min_green, max_green=max_green)
        elif controller_type == "adaptive":
            controller = QueueAdaptiveController(min_green=min_green, max_green=max_green)
        else:  # pulse
            weights = intent_weights or {}
            # Accept both short keys (efficiency) and *_weight / camelCase from Intent Studio
            eff = weights.get("efficiency_weight", weights.get("efficiency", weights.get("efficiencyWeight", 0.4)))
            fair = weights.get("fairness_weight", weights.get("fairness", weights.get("fairnessWeight", 0.3)))
            prio = weights.get("priority_weight", weights.get("priority", weights.get("priorityWeight", 0.3)))
            prios = priorities or weights.get("priorities") or {}
            prios = {k: float(v) for k, v in prios.items()}
            controller = PULSEController(
                efficiency_weight=float(eff),
                fairness_weight=float(fair),
                priority_weight=float(prio),
                priorities=prios,
                min_green=min_green,
                max_green=max_green,
            )

        durations = controller.compute_phase_durations(
            queue_sizes=queue_sizes,
            waiting_times=waiting_times,
            current_time=current_time,
        )

        phase_dicts = []
        for phase, green in durations.items():
            approaches = PHASE_APPROACHES.get(phase, [])
            phase_dicts.append(
                {
                    "phase": phase,
                    "green_duration": round(green, 1),
                    "yellow_duration": 3.0,
                    "all_red_duration": 2.0,
                    "approaches": approaches,
                }
            )

        safety_result = self.safety_agent.validate(phase_dicts)

        return SignalPlan(
            phase_durations=phase_dicts,
            controller_type=controller_type,
            safety_result=safety_result,
            score=sum(durations.values()),
        )
