"""Experiment Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ExperimentRunRequest(BaseModel):
    scenario: str = Field(..., pattern="^[A-Da-d]$|^(balanced|east_heavy|ns_heavy|surge)$")
    controller_type: str = Field(..., pattern="^(fixed|adaptive|pulse|all)$")
    duration: int = Field(default=3600, ge=60, le=7200)
    seed: int = Field(default=42, ge=0)
    config: Optional[dict] = None
    intent_weights: Optional[dict] = None


class ExperimentMetricSchema(BaseModel):
    metric_name: str
    metric_value: float
    approach: Optional[str] = None


class ExperimentRunResponse(BaseModel):
    id: int
    scenario: str
    controller_type: str
    duration: int
    seed: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    metrics: list[ExperimentMetricSchema] = []
    results: Optional[dict] = None


class ExperimentListResponse(BaseModel):
    experiments: list[ExperimentRunResponse]
    total: int
    page: int
    page_size: int
