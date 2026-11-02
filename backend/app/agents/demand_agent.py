"""Demand estimation agent - queue and waiting time estimation."""

import logging
from dataclasses import dataclass, field
from collections import deque
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

APPROACHES = ["north", "south", "east", "west"]


@dataclass
class ApproachDemand:
    approach: str
    queue_count: int = 0
    vehicle_count: int = 0
    avg_wait: float = 0.0
    max_wait: float = 0.0
    arrival_rate: float = 0.0  # estimated veh/hr
    saturation: float = 0.0  # utilization [0,1]


@dataclass
class DemandEstimate:
    approaches: list[ApproachDemand] = field(default_factory=list)
    total_vehicles: int = 0
    system_saturation: float = 0.0
    timestamp: float = 0.0


class DemandAgent:
    """
    Estimates queue lengths and waiting times from vehicle detections
    and historical observations.
    """

    HISTORY_WINDOW = 60  # seconds

    def __init__(self):
        self._arrival_history: dict[str, deque] = {
            a: deque(maxlen=self.HISTORY_WINDOW) for a in APPROACHES
        }
        self._queue_history: dict[str, deque] = {
            a: deque(maxlen=self.HISTORY_WINDOW) for a in APPROACHES
        }
        self._wait_history: dict[str, deque] = {
            a: deque(maxlen=self.HISTORY_WINDOW) for a in APPROACHES
        }

    def update(
        self,
        detections_by_approach: dict[str, list],
        current_time: float = 0.0,
    ) -> DemandEstimate:
        """Update demand estimates from new detections."""
        approach_demands: list[ApproachDemand] = []
        total = 0

        for approach in APPROACHES:
            dets = detections_by_approach.get(approach, [])
            queued = [d for d in dets if getattr(d, "is_queued", True)]
            n_queue = len(queued)
            n_total = len(dets)
            total += n_total

            self._arrival_history[approach].append(n_total)
            self._queue_history[approach].append(n_queue)

            # Estimate arrival rate (veh/hr) from recent history
            recent_arrivals = list(self._arrival_history[approach])
            arr_rate = float(np.mean(recent_arrivals)) * 3600.0 if recent_arrivals else 0.0

            # Prefer track-age waits when available; else heuristic from queue length
            track_waits = [float(getattr(d, "wait_time", 0.0) or 0.0) for d in queued]
            if track_waits and max(track_waits) > 0:
                avg_wait = float(np.mean(track_waits))
                max_wait = float(np.max(track_waits))
            else:
                avg_wait = n_queue * 2.5
                max_wait = n_queue * 4.0
            self._wait_history[approach].append(avg_wait)

            saturation = min(1.0, arr_rate / 1800.0)  # capacity ~1800 veh/hr/lane

            approach_demands.append(
                ApproachDemand(
                    approach=approach,
                    queue_count=n_queue,
                    vehicle_count=n_total,
                    avg_wait=round(avg_wait, 1),
                    max_wait=round(max_wait, 1),
                    arrival_rate=round(arr_rate, 1),
                    saturation=round(saturation, 3),
                )
            )

        system_sat = float(np.mean([d.saturation for d in approach_demands]))
        return DemandEstimate(
            approaches=approach_demands,
            total_vehicles=total,
            system_saturation=round(system_sat, 3),
            timestamp=current_time,
        )
