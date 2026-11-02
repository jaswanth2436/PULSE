"""Signal plan Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PhaseDuration(BaseModel):
    phase: str
    green_duration: float
    yellow_duration: float = 3.0
    all_red_duration: float = 2.0
    approaches: list[str] = []


class SignalPlanRequest(BaseModel):
    phase_durations: list[PhaseDuration]
    controller_type: str = "pulse"


class SignalPlanResponse(BaseModel):
    id: Optional[int] = None
    phase_durations: list[PhaseDuration]
    safety_valid: bool = True
    violations: list[str] = []
    created_at: Optional[datetime] = None


class ControllerStatusResponse(BaseModel):
    controller_type: str
    active_phase: str
    phase_remaining: float
    cycle_count: int
    total_served: int
    efficiency: float


class ControllerModeRequest(BaseModel):
    mode: str = Field(..., pattern="^(fixed|adaptive|pulse)$")
    config: Optional[dict] = None


class OptimizeRequest(BaseModel):
    approach_queues: dict[str, int] = {}
    approach_waits: dict[str, float] = {}
    intent_weights: Optional[dict] = None
