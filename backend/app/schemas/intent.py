"""Intent Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class IntentWeights(BaseModel):
    efficiency: float = Field(default=0.4, ge=0.0, le=1.0)
    fairness: float = Field(default=0.3, ge=0.0, le=1.0)
    priority: float = Field(default=0.3, ge=0.0, le=1.0)


class IntentConstraints(BaseModel):
    min_green: int = Field(default=10, ge=5, le=30)
    max_green: int = Field(default=60, ge=30, le=120)
    max_wait_threshold: int = Field(default=120, ge=60, le=300)
    starvation_prevention: bool = True


class IntentPriorities(BaseModel):
    north: float = Field(default=1.0, ge=0.0, le=5.0)
    south: float = Field(default=1.0, ge=0.0, le=5.0)
    east: float = Field(default=1.0, ge=0.0, le=5.0)
    west: float = Field(default=1.0, ge=0.0, le=5.0)


class IntentProfileRequest(BaseModel):
    weights: IntentWeights = IntentWeights()
    priorities: IntentPriorities = IntentPriorities()
    constraints: IntentConstraints = IntentConstraints()


class IntentProfileResponse(BaseModel):
    id: Optional[int] = None
    weights: IntentWeights
    priorities: IntentPriorities
    constraints: IntentConstraints
    created_at: Optional[datetime] = None


class IntentCompareRequest(BaseModel):
    plan_a: dict
    plan_b: dict
    metrics: list[str] = ["avg_delay", "throughput", "fairness_index"]
