"""PULSE intent-driven traffic signal controller."""

import numpy as np
from app.simulation.signal_phases import PHASE_APPROACHES, ALL_APPROACHES


class PULSEController:
    """
    PULSE weighted scoring controller.

    Score(phase_i) = w1 * NormalizedQueue(i)
                   + w2 * NormalizedWaiting(i)
                   + w3 * UserPriority(i)

    w1 = efficiency_weight (queue reduction)
    w2 = fairness_weight (equalize waiting)
    w3 = priority_weight (user-defined lane priority)

    Fairness: boost score if approach hasn't been served recently.
    Starvation prevention: force green if max_wait > threshold.
    """

    def __init__(
        self,
        efficiency_weight: float = 0.4,
        fairness_weight: float = 0.3,
        priority_weight: float = 0.3,
        priorities: dict[str, float] | None = None,
        min_green: int = 10,
        max_green: int = 60,
        max_wait_threshold: int = 120,
    ):
        self.w1 = efficiency_weight
        self.w2 = fairness_weight
        self.w3 = priority_weight
        self.priorities = priorities or {a: 1.0 for a in ALL_APPROACHES}
        self.min_green = float(min_green)
        self.max_green = float(max_green)
        self.max_wait_threshold = float(max_wait_threshold)
        self._last_served: dict[str, float] = {a: 0.0 for a in ALL_APPROACHES}

    def _normalize(self, values: dict[str, float]) -> dict[str, float]:
        """Normalize a dict of values to [0, 1]."""
        vals = list(values.values())
        vmax = max(vals) if vals else 1.0
        vmin = min(vals) if vals else 0.0
        span = vmax - vmin if vmax > vmin else 1.0
        return {k: (v - vmin) / span for k, v in values.items()}

    def compute_phase_durations(
        self,
        queue_sizes: dict[str, int],
        waiting_times: dict[str, float],
        current_time: float = 0.0,
    ) -> dict[str, float]:
        """Compute PULSE-optimized phase durations."""
        queue_f = {a: float(queue_sizes.get(a, 0)) for a in ALL_APPROACHES}
        wait_f = {a: float(waiting_times.get(a, 0.0)) for a in ALL_APPROACHES}
        priority_f = {a: float(self.priorities.get(a, 1.0)) for a in ALL_APPROACHES}

        norm_q = self._normalize(queue_f)
        norm_w = self._normalize(wait_f)
        norm_p = self._normalize(priority_f)

        # Approach-level scores
        approach_scores: dict[str, float] = {}
        for approach in ALL_APPROACHES:
            score = (
                self.w1 * norm_q[approach]
                + self.w2 * norm_w[approach]
                + self.w3 * norm_p[approach]
            )
            # Fairness boost: if not served recently
            time_since_served = current_time - self._last_served.get(approach, 0.0)
            if time_since_served > self.max_wait_threshold / 2:
                score *= 1.5
            approach_scores[approach] = score

        # Phase-level scores: sum of approach scores
        phase_scores: dict[str, float] = {}
        for phase, approaches in PHASE_APPROACHES.items():
            phase_scores[phase] = sum(approach_scores.get(a, 0.0) for a in approaches)

        total = sum(phase_scores.values())
        green_range = self.max_green - self.min_green
        durations: dict[str, float] = {}

        if total == 0:
            for phase in PHASE_APPROACHES:
                durations[phase] = (self.min_green + self.max_green) / 2.0
        else:
            for phase, score in phase_scores.items():
                proportion = score / total
                green = self.min_green + proportion * green_range
                # Starvation prevention: force extended green if any approach is starved
                for approach in PHASE_APPROACHES[phase]:
                    if waiting_times.get(approach, 0.0) > self.max_wait_threshold:
                        green = self.max_green
                        break
                durations[phase] = max(self.min_green, min(self.max_green, green))

        return durations

    def notify_phase_served(self, phase: str, current_time: float):
        """Notify controller that a phase served vehicles (updates last_served)."""
        for approach in PHASE_APPROACHES.get(phase, []):
            self._last_served[approach] = current_time

    @property
    def controller_type(self) -> str:
        return "pulse"
