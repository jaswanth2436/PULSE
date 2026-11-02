"""Experiment run and export endpoints."""

import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from app.database.init_db import get_db
from app.services.experiment_service import (
    run_experiment_all_controllers, get_experiments,
    get_experiment_detail, export_experiment_csv,
)

router = APIRouter(tags=["experiments"])


class ExperimentRunRequest(BaseModel):
    scenario: str = "A"
    duration: int = 3600
    seed: int = 42
    arrival_rates: Optional[dict] = None
    min_green: int = 10
    max_green: int = 60
    yellow_duration: int = 3
    all_red_duration: int = 2
    service_rate: float = 0.5
    intent_weights: Optional[dict] = None


@router.post("/run")
async def run_experiment(req: ExperimentRunRequest, db=Depends(get_db)):
    """Run all three controllers on the same scenario and save results."""
    from app.simulation.scenarios import SCENARIOS
    config = {
        "duration": req.duration,
        "seed": req.seed,
        "min_green": req.min_green,
        "max_green": req.max_green,
        "yellow_duration": req.yellow_duration,
        "all_red_duration": req.all_red_duration,
        "service_rate": req.service_rate,
        "scenario": req.scenario,
        "controller_type": "pulse",
    }
    if req.arrival_rates:
        config["arrival_rates"] = req.arrival_rates
    elif req.scenario in SCENARIOS:
        config.update(SCENARIOS[req.scenario])

    if req.intent_weights:
        config["intent_weights"] = req.intent_weights

    results = await run_experiment_all_controllers(config, db)
    return {"status": "completed", "results": results}


@router.get("")
async def list_experiments(skip: int = 0, limit: int = 50, db=Depends(get_db)):
    exps = await get_experiments(db, skip=skip, limit=limit)
    return {"experiments": exps, "total": len(exps)}


@router.get("/{experiment_id}")
async def get_experiment(experiment_id: int, db=Depends(get_db)):
    detail = await get_experiment_detail(db, experiment_id)
    if not detail:
        raise HTTPException(404, f"Experiment {experiment_id} not found")
    return detail


@router.get("/{experiment_id}/export")
async def export_experiment(experiment_id: int, format: str = "csv", db=Depends(get_db)):
    detail = await get_experiment_detail(db, experiment_id)
    if not detail:
        raise HTTPException(404, f"Experiment {experiment_id} not found")

    if format == "json":
        return Response(
            content=json.dumps(detail, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=experiment_{experiment_id}.json"},
        )
    else:
        csv_content = export_experiment_csv(detail)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=experiment_{experiment_id}.csv"},
        )

