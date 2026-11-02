"""Signal phase model for simulation."""

from enum import Enum
from dataclasses import dataclass


class SignalState(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"
    ALL_RED = "ALL_RED"


PHASE_APPROACHES = {
    "PHASE_1": ["north", "south"],  # North-South green
    "PHASE_2": ["east", "west"],    # East-West green
}

ALL_APPROACHES = ["north", "south", "east", "west"]


@dataclass
class PhaseState:
    """Current state of the signal controller."""

    current_phase: str = "PHASE_1"
    state: SignalState = SignalState.GREEN
    time_in_state: float = 0.0
    phase_green_duration: float = 30.0
    yellow_duration: float = 3.0
    all_red_duration: float = 2.0
    cycle_count: int = 0

    def get_signals(self) -> dict[str, str]:
        """Return current signal state per approach."""
        signals = {}
        green_approaches = PHASE_APPROACHES.get(self.current_phase, [])
        for approach in ALL_APPROACHES:
            if self.state == SignalState.ALL_RED:
                signals[approach] = SignalState.ALL_RED.value
            elif approach in green_approaches:
                signals[approach] = self.state.value
            else:
                signals[approach] = SignalState.RED.value
        return signals

    def next_phase(self) -> str:
        phases = list(PHASE_APPROACHES.keys())
        idx = phases.index(self.current_phase)
        return phases[(idx + 1) % len(phases)]
