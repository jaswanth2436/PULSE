"""Simulation Pydantic schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class SimulationConfig(BaseModel):
    duration: int = Field(default=3600, ge=60, le=7200)
    arrival_rates: dict[str, float] = Field(
        default_factory=lambda: {
            "north": 300.0,
            "south": 300.0,
            "east": 300.0,
            "west": 300.0,
        }
    )
    seed: int = Field(default=42, ge=0)
    min_green: int = Field(default=10, ge=5, le=30)
    max_green: int = Field(default=60, ge=30, le=120)
    yellow_duration: int = Field(default=3, ge=2, le=6)
    all_red_duration: int = Field(default=2, ge=1, le=5)
    service_rate: float = Field(default=0.5, ge=0.1, le=2.0)
    initial_queues: dict[str, int] = Field(default_factory=dict)
    scenario: Optional[str] = None
    controller_type: str = Field(default="pulse", pattern="^(fixed|adaptive|pulse)$")
    intent_weights: Optional[dict] = None


class TimeSeriesPoint(BaseModel):
    t: float
    queues: dict[str, int]
    phase: str
    signals: dict[str, str]


class SimulationResult(BaseModel):
    vehicles_served: int
    avg_delay: float
    p95_delay: float
    max_queue: int
    avg_queue: float
    throughput: float
    approach_delays: dict[str, float]
    safety_violations: int
    computation_time: float
    time_series: list[TimeSeriesPoint] = []
    controller_type: str = "pulse"
    scenario: Optional[str] = None
    seed: int = 42


class SimulationStatusResponse(BaseModel):
    is_running: bool
    progress: float = 0.0
    current_time: float = 0.0
    total_time: float = 0.0
    controller_type: str = "pulse"
    scenario: Optional[str] = None
    results: Optional[SimulationResult] = None
