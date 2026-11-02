"""Intent Studio endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.traffic_service import get_intent, update_intent, get_current_traffic_state, set_current_plan
from app.agents.orchestrator import orchestrator

router = APIRouter(tags=["intent"])


class IntentUpdateRequest(BaseModel):
    priorities: dict[str, int] = {}
    efficiencyWeight: float = 0.4
    fairnessWeight: float = 0.4
    priorityWeight: float = 0.2
    protectedCrossings: list[str] = []


class CompareRequest(BaseModel):
    plan_a: Optional[dict] = None
    plan_b: Optional[dict] = None
    queues: Optional[dict] = None
    waits: Optional[dict] = None
    generate_alternatives: bool = True


@router.get("/current")
async def get_current_intent():
    return get_intent()


@router.post("/update")
async def update_intent_profile(req: IntentUpdateRequest):
    update_intent({
        "priorities": req.priorities,
        "efficiencyWeight": req.efficiencyWeight,
        "fairnessWeight": req.fairnessWeight,
        "priorityWeight": req.priorityWeight,
        "protectedCrossings": req.protectedCrossings,
    })
    return {"status": "updated", "intent": get_intent()}


@router.post("/compare")
async def compare_plans(req: CompareRequest):
    """Compare two alternative signal plans. Can auto-generate efficiency vs fairness plans."""
    traffic = get_current_traffic_state()
    intent = get_intent()
    queues = req.queues or {k: max(1, v["queued"]) for k, v in traffic["approaches"].items()}
    waits = req.waits or {k: max(1.0, v["avgWait"]) for k, v in traffic["approaches"].items()}

    plan_a = req.plan_a
    plan_b = req.plan_b

    if req.generate_alternatives or not plan_a or not plan_b:
        # Plan A: efficiency-heavy
        plan_a = orchestrator.optimize_signal(
            queue_sizes=queues,
            waiting_times=waits,
            intent={
                "priorities": intent.get("priorities", {}),
                "efficiency_weight": 0.7,
                "fairness_weight": 0.2,
                "priority_weight": 0.1,
            },
        )
        # Plan B: fairness + priority heavy (user intent)
        plan_b = orchestrator.optimize_signal(
            queue_sizes=queues,
            waiting_times=waits,
            intent={
                "priorities": intent.get("priorities", {}),
                "efficiency_weight": intent.get("efficiencyWeight", 0.2),
                "fairness_weight": intent.get("fairnessWeight", 0.4),
                "priority_weight": intent.get("priorityWeight", 0.4),
            },
        )

    result_a = orchestrator.evaluate_plan(plan_a, queues, waits)
    result_b = orchestrator.evaluate_plan(plan_b, queues, waits)

    # Jain fairness index on green durations
    def jain(plan: dict) -> float:
        greens = [p.get("green_duration", 30) for p in plan.get("phases", [])]
        if not greens:
            return 0.0
        s = sum(greens)
        sq = sum(g * g for g in greens)
        n = len(greens)
        return round((s * s) / (n * sq), 3) if sq else 0.0

    result_a["fairness_index"] = jain(plan_a)
    result_b["fairness_index"] = jain(plan_b)

    recommendation = "A" if result_a.get("estimated_delay", 999) <= result_b.get("estimated_delay", 999) else "B"
    set_current_plan(plan_a if recommendation == "A" else plan_b)

    return {
        "plan_a": {**plan_a, **{k: result_a[k] for k in result_a if k not in plan_a}},
        "plan_b": {**plan_b, **{k: result_b[k] for k in result_b if k not in plan_b}},
        "evaluation_a": result_a,
        "evaluation_b": result_b,
        "recommendation": recommendation,
        "labels": {
            "A": "Efficiency-focused alternative",
            "B": "Fairness/priority-focused (current intent)",
        },
    }


@router.post("/generate-alternatives")
async def generate_alternatives():
    """Convenience endpoint: generate Plan A/B from current traffic + intent."""
    return await compare_plans(CompareRequest(generate_alternatives=True))
