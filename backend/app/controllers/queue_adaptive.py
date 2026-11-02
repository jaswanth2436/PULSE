"""Queue-pressure adaptive traffic signal controller."""

from app.simulation.signal_phases import PHASE_APPROACHES


class QueueAdaptiveController:
    """
    Queue-adaptive signal controller.
    Allocates green time proportional to queue pressure on each phase.

    Score(phase) = sum(queue[approach] for approach in phase)
    Green = min_green + (score/total_score) * (max_green - min_green)
    """

    def __init__(self, min_green: int = 10, max_green: int = 60):
        self.min_green = float(min_green)
        self.max_green = float(max_green)

    def compute_phase_durations(
        self,
        queue_sizes: dict[str, int],
        waiting_times: dict[str, float],
        current_time: float = 0.0,
    ) -> dict[str, float]:
        """Compute green time for each phase proportional to queue pressure."""
        phase_scores: dict[str, float] = {}

        for phase, approaches in PHASE_APPROACHES.items():
            score = sum(queue_sizes.get(a, 0) for a in approaches)
            phase_scores[phase] = float(score)

        total_score = sum(phase_scores.values())
        durations: dict[str, float] = {}

        if total_score == 0:
            # Equal split when no queues
            for phase in PHASE_APPROACHES:
                durations[phase] = (self.min_green + self.max_green) / 2.0
        else:
            green_range = self.max_green - self.min_green
            for phase, score in phase_scores.items():
                proportion = score / total_score
                green = self.min_green + proportion * green_range
                durations[phase] = max(self.min_green, min(self.max_green, green))

        return durations

    @property
    def controller_type(self) -> str:
        return "adaptive"
