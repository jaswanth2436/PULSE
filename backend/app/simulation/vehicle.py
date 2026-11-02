"""Vehicle entity for simulation."""

from dataclasses import dataclass, field


@dataclass
class Vehicle:
    """Represents a vehicle in the simulation."""

    vehicle_id: int
    approach: str
    arrival_time: float
    departure_time: float = -1.0
    delay: float = 0.0
    vehicle_class: str = "car"

    def compute_delay(self, departure_time: float, free_flow_time: float = 5.0) -> float:
        """Compute delay relative to free flow travel time."""
        self.departure_time = departure_time
        self.delay = max(0.0, (departure_time - self.arrival_time) - free_flow_time)
        return self.delay

    @property
    def is_served(self) -> bool:
        return self.departure_time >= 0
