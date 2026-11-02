"""Traffic data Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ApproachState(BaseModel):
    approach: str
    vehicle_count: int = 0
    queue_count: int = 0
    avg_wait: float = 0.0
    max_wait: float = 0.0
    signal_state: str = "RED"


class TrafficState(BaseModel):
    timestamp: datetime
    total_vehicles: int = 0
    approaches: list[ApproachState] = []
    active_phase: str = "PHASE_1"
    phase_remaining: float = 0.0
    fps: float = 0.0
    is_processing: bool = False


class TrafficHistoryPoint(BaseModel):
    timestamp: datetime
    total_vehicles: int
    avg_queue: float
    phase: str


class TrafficHistoryResponse(BaseModel):
    history: list[TrafficHistoryPoint]
    window_seconds: int = 300


class VehicleDetection(BaseModel):
    id: str
    vehicle_class: str
    bbox: list[float] = []
    approach: str
    confidence: float
    is_queued: bool = False
    crossed_line: bool = False
