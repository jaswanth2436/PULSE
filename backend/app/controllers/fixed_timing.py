"""Fixed-timing traffic signal controller."""

from app.simulation.signal_phases import PHASE_APPROACHES


class FixedTimingController:
    """
    Fixed-cycle signal controller.
    Uses pre-configured phase durations regardless of queue state.
    """

    def __init__(
        self,
        phase_durations: dict[str, float] | None = None,
        min_green: int = 10,
        max_green: int = 60,
    ):
        self.min_green = min_green
        self.max_green = max_green
        self.phase_durations = phase_durations or {
            "PHASE_1": 30.0,
            "PHASE_2": 30.0,
        }
        # Clamp to bounds
        for k in self.phase_durations:
            self.phase_durations[k] = float(
                max(min_green, min(max_green, self.phase_durations[k]))
            )

    def compute_phase_durations(
        self,
        queue_sizes: dict[str, int],
        waiting_times: dict[str, float],
        current_time: float = 0.0,
    ) -> dict[str, float]:
        """Return fixed phase durations (ignores queue state)."""
        return dict(self.phase_durations)

    @property
    def controller_type(self) -> str:
        return "fixed"
