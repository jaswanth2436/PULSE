"""Report generation helpers for experiment comparisons and CSV export."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Optional


def build_comparison_csv(
    results: dict,
    scenario: str = "A",
    seed: int = 42,
    title: str = "PULSE Controller Comparison Report",
) -> str:
    """
    Build a CSV string comparing fixed / adaptive / pulse controller results.
    `results` maps controller name -> metric dict (snake_case keys).
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([title])
    writer.writerow(["Generated", datetime.now(timezone.utc).isoformat()])
    writer.writerow(["Scenario", scenario])
    writer.writerow(["Seed", seed])
    writer.writerow(["Source", "simulation"])
    writer.writerow([])

    controllers = [c for c in ("fixed", "adaptive", "pulse") if c in results]
    if not controllers:
        controllers = list(results.keys())

    metrics = [
        "avg_delay", "p95_delay", "max_queue", "avg_queue",
        "throughput", "vehicles_served", "safety_violations", "computation_time",
    ]

    writer.writerow(["Metric"] + [c.upper() for c in controllers])
    for metric in metrics:
        row = [metric]
        for c in controllers:
            val = results.get(c, {}).get(metric, "")
            row.append(val)
        writer.writerow(row)

    writer.writerow([])
    writer.writerow(["Notes"])
    writer.writerow(["All values are from reproducible discrete-event simulation, not field measurements."])
    if "fixed" in results and "pulse" in results:
        fixed_d = float(results["fixed"].get("avg_delay") or 0)
        pulse_d = float(results["pulse"].get("avg_delay") or 0)
        if fixed_d > 0:
            improvement = round((fixed_d - pulse_d) / fixed_d * 100, 1)
            writer.writerow([f"PULSE vs Fixed avg_delay improvement: {improvement}%"])
    return output.getvalue()


def build_narrative_report(
    results: dict,
    scenario: str = "A",
    seed: int = 42,
) -> dict:
    """Build a structured narrative comparison for the Reports API."""
    narrative = []
    narrative.append(
        f"PULSE ran a controlled comparison on scenario {scenario} (seed={seed}). "
        "All controllers saw identical Poisson arrivals."
    )
    for name, metrics in results.items():
        narrative.append(
            f"{name.upper()}: avg delay {metrics.get('avg_delay')}s, "
            f"throughput {metrics.get('throughput')} veh/hr, "
            f"max queue {metrics.get('max_queue')}, "
            f"safety violations {metrics.get('safety_violations', 0)}."
        )
    if "fixed" in results and "pulse" in results:
        fd = float(results["fixed"].get("avg_delay") or 0)
        pd = float(results["pulse"].get("avg_delay") or 0)
        if fd > 0:
            narrative.append(
                f"Relative to fixed timing, PULSE changed average delay by "
                f"{round((pd - fd) / fd * 100, 1)}% "
                f"({'improvement' if pd < fd else 'increase'})."
            )
    return {
        "scenario": scenario,
        "seed": seed,
        "source": "simulation",
        "results": results,
        "narrative": narrative,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def summarize_experiment_detail(exp_detail: dict) -> str:
    """Human-readable one-liner for a single persisted experiment."""
    metrics = {m["name"]: m["value"] for m in exp_detail.get("metrics", []) if not m.get("approach")}
    return (
        f"Experiment #{exp_detail.get('id')} | {exp_detail.get('controller')} | "
        f"scenario {exp_detail.get('scenario')} | "
        f"avg_delay={metrics.get('avg_delay', 'n/a')} "
        f"throughput={metrics.get('throughput', 'n/a')}"
    )
