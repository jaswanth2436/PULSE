"""Reports endpoints."""

import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from app.database.init_db import get_db
from app.models.database import Report, ExperimentRun

router = APIRouter(tags=["reports"])
logger = logging.getLogger("pulse.reports")


@router.get("")
async def list_reports(db=Depends(get_db)):
    result = await db.execute(
        select(Report).order_by(Report.created_at.desc()).limit(100)
    )
    rows = result.scalars().all()
    return {"reports": [_report_to_dict(r) for r in rows]}


@router.get("/{report_id}")
async def get_report(report_id: int, db=Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, f"Report {report_id} not found")
    return _report_to_dict(report, full=True)


def _report_to_dict(r: Report, full: bool = False) -> dict:
    d = {
        "id": r.id,
        "experiment_id": r.experiment_id,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
    if full:
        try:
            d["config"] = json.loads(r.config_json or "{}")
            d["results"] = json.loads(r.results_json or "{}")
        except (TypeError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Invalid stored report JSON for report %s: %s", r.id, exc)
            d["config"] = {}
            d["results"] = {}
    return d
