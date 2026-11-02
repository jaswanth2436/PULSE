"""Experiment service - run, save and export experiments."""

import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import ExperimentRun, ExperimentMetric, Report
from app.schemas.simulation import SimulationConfig, SimulationResult
from app.simulation.intersection import IntersectionSimulator
from app.controllers.fixed_timing import FixedTimingController
from app.controllers.queue_adaptive import QueueAdaptiveController
from app.controllers.pulse_controller import PULSEController
from app.simulation.scenarios import SCENARIOS

logger = logging.getLogger("pulse.experiments")


async def run_experiment_all_controllers(
    config_dict: dict,
    db: AsyncSession,
) -> dict:
    """Run fixed, adaptive and PULSE controllers on identical traffic. Save results."""
    base_config = SimulationConfig(**config_dict)
    results = {}

    for ctrl_type in ["fixed", "adaptive", "pulse"]:
        cfg = base_config.model_copy(update={"controller_type": ctrl_type})
        sim = _build_simulator(cfg)
        result = sim.run()
        results[ctrl_type] = result

        # Persist
        exp = ExperimentRun(
            scenario=cfg.scenario or "custom",
            controller_type=ctrl_type,
            duration=cfg.duration,
            seed=cfg.seed,
            config_json=json.dumps(cfg.model_dump()),
            status="completed",
            completed_at=datetime.now(timezone.utc),
        )
        db.add(exp)
        await db.flush()

        # Metrics
        _save_metrics(db, exp.id, result)

        # Report
        report = Report(
            experiment_id=exp.id,
            config_json=json.dumps(cfg.model_dump()),
            results_json=json.dumps(result.model_dump(exclude={"time_series"})),
            created_at=datetime.now(timezone.utc),
        )
        db.add(report)

    await db.commit()
    return {k: v.model_dump(exclude={"time_series"}) for k, v in results.items()}


def _build_simulator(cfg: SimulationConfig) -> IntersectionSimulator:
    if cfg.controller_type == "fixed":
        ctrl = FixedTimingController(
            phase_durations={"PHASE_1": 30.0, "PHASE_2": 30.0},
            min_green=cfg.min_green,
            max_green=cfg.max_green,
        )
    elif cfg.controller_type == "adaptive":
        ctrl = QueueAdaptiveController(
            min_green=cfg.min_green,
            max_green=cfg.max_green,
        )
    else:
        intent = cfg.intent_weights or {}
        ctrl = PULSEController(
            min_green=cfg.min_green,
            max_green=cfg.max_green,
            efficiency_weight=intent.get("efficiency_weight", 0.4),
            fairness_weight=intent.get("fairness_weight", 0.4),
            priority_weight=intent.get("priority_weight", 0.2),
            priorities=intent.get("priorities", {}),
        )
    return IntersectionSimulator(cfg, controller=ctrl)


def _save_metrics(db: AsyncSession, exp_id: int, result: SimulationResult):
    scalars = {
        "avg_delay": result.avg_delay,
        "p95_delay": result.p95_delay,
        "max_queue": result.max_queue,
        "avg_queue": result.avg_queue,
        "throughput": result.throughput,
        "vehicles_served": result.vehicles_served,
        "safety_violations": result.safety_violations,
        "computation_time": result.computation_time,
    }
    for name, val in scalars.items():
        db.add(ExperimentMetric(experiment_id=exp_id, metric_name=name, metric_value=float(val)))
    for approach, delay in result.approach_delays.items():
        db.add(ExperimentMetric(experiment_id=exp_id, metric_name="approach_delay", metric_value=delay, approach=approach))


async def get_experiments(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[dict]:
    result = await db.execute(
        select(ExperimentRun).order_by(ExperimentRun.created_at.desc()).offset(skip).limit(limit)
    )
    rows = result.scalars().all()
    return [_exp_to_dict(r) for r in rows]


async def get_experiment_detail(db: AsyncSession, exp_id: int) -> Optional[dict]:
    result = await db.execute(select(ExperimentRun).where(ExperimentRun.id == exp_id))
    exp = result.scalar_one_or_none()
    if not exp:
        return None
    metrics_result = await db.execute(select(ExperimentMetric).where(ExperimentMetric.experiment_id == exp_id))
    metrics = metrics_result.scalars().all()
    d = _exp_to_dict(exp)
    d["metrics"] = [{"name": m.metric_name, "value": m.metric_value, "approach": m.approach} for m in metrics]
    return d


def _exp_to_dict(exp: ExperimentRun) -> dict:
    config = {}
    try:
        config = json.loads(exp.config_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        logger.warning("Invalid stored experiment config for experiment %s: %s", exp.id, exc)
    return {
        "id": exp.id,
        "scenario": exp.scenario,
        "controller": exp.controller_type,
        "duration": exp.duration,
        "seed": exp.seed,
        "config": config,
        "status": exp.status,
        "created_at": exp.created_at.isoformat() if exp.created_at else None,
        "completed_at": exp.completed_at.isoformat() if exp.completed_at else None,
    }


def export_experiment_csv(exp_detail: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["PULSE Experiment Report"])
    writer.writerow(["Experiment ID", exp_detail.get("id")])
    writer.writerow(["Scenario", exp_detail.get("scenario")])
    writer.writerow(["Controller", exp_detail.get("controller")])
    writer.writerow(["Duration (s)", exp_detail.get("duration")])
    writer.writerow(["Seed", exp_detail.get("seed")])
    writer.writerow(["Status", exp_detail.get("status")])
    writer.writerow(["Created At", exp_detail.get("created_at")])
    writer.writerow([])
    writer.writerow(["Metric", "Value", "Approach"])
    for m in exp_detail.get("metrics", []):
        writer.writerow([m["name"], m["value"], m.get("approach", "")])
    return output.getvalue()
