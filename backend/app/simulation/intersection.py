"""Four-way intersection discrete-event traffic simulator."""

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, TYPE_CHECKING

import numpy as np

from app.schemas.simulation import SimulationConfig, SimulationResult, TimeSeriesPoint
from app.simulation.vehicle import Vehicle
from app.simulation.signal_phases import SignalState, PhaseState, PHASE_APPROACHES, ALL_APPROACHES

if TYPE_CHECKING:
    from app.controllers.fixed_timing import FixedTimingController
    from app.controllers.queue_adaptive import QueueAdaptiveController
    from app.controllers.pulse_controller import PULSEController


class IntersectionSimulator:
    """
    Discrete-event traffic simulator for a four-way signalized intersection.

    Supports three controller types: fixed, adaptive, and pulse.
    Uses Poisson arrivals and FIFO queuing per approach.
    """

    DT = 1.0  # simulation time step in seconds

    def __init__(self, config: SimulationConfig, controller=None):
        self.config = config
        self.rng = np.random.default_rng(config.seed)
        self.controller = controller
        self._reset()

    def _reset(self):
        """Reset all simulation state."""
        self.t = 0.0
        self.queues: dict[str, deque] = {a: deque() for a in ALL_APPROACHES}
        self.vehicle_counter = 0
        self.served_vehicles: list[Vehicle] = []
        self.safety_violations = 0
        self.time_series: list[TimeSeriesPoint] = []
        self.last_green: dict[str, float] = {a: 0.0 for a in ALL_APPROACHES}

        # Phase state
        self.phase = PhaseState(
            yellow_duration=float(self.config.yellow_duration),
            all_red_duration=float(self.config.all_red_duration),
        )

        # Precompute per-step arrival probabilities
        # arrival_rates in veh/hr -> veh/sec
        self.arrival_probs = {
            a: self.config.arrival_rates.get(a, 0.0) / 3600.0
            for a in ALL_APPROACHES
        }

        # Seed initial queues
        for approach, count in self.config.initial_queues.items():
            for _ in range(count):
                v = Vehicle(
                    vehicle_id=self._next_id(),
                    approach=approach,
                    arrival_time=0.0,
                )
                self.queues[approach].append(v)

        # Phase green durations: determined by controller each cycle
        self._pending_green: dict[str, float] = {}
        self._initialize_controller()

    def _next_id(self) -> int:
        self.vehicle_counter += 1
        return self.vehicle_counter

    def _initialize_controller(self):
        """Ask controller for initial phase durations."""
        if self.controller is not None:
            self._pending_green = self.controller.compute_phase_durations(
                queue_sizes=self._get_queue_sizes(),
                waiting_times=self._get_max_waits(),
                current_time=self.t,
            )
        else:
            self._pending_green = {
                "PHASE_1": float(self.config.min_green + self.config.max_green) / 2,
                "PHASE_2": float(self.config.min_green + self.config.max_green) / 2,
            }
        self.phase.phase_green_duration = self._pending_green.get(self.phase.current_phase, 30.0)

    def _get_queue_sizes(self) -> dict[str, int]:
        return {a: len(self.queues[a]) for a in ALL_APPROACHES}

    def _get_max_waits(self) -> dict[str, float]:
        result = {}
        for approach in ALL_APPROACHES:
            if self.queues[approach]:
                oldest = self.queues[approach][0]
                result[approach] = self.t - oldest.arrival_time
            else:
                result[approach] = 0.0
        return result

    def _get_arrival_rates(self) -> dict[str, float]:
        """Return possibly time-varying arrival rates (for surge scenario)."""
        rates = dict(self.arrival_probs)
        # Override for surge scenario: spike after 1200s
        if self.config.scenario == "D" or self.config.scenario == "surge":
            if self.t >= 1200.0:
                for a in ALL_APPROACHES:
                    rates[a] = 800.0 / 3600.0
        return rates

    def _generate_arrivals(self):
        """Generate Poisson arrivals for this time step."""
        rates = self._get_arrival_rates()
        for approach in ALL_APPROACHES:
            rate = rates[approach]
            # Poisson: number of arrivals in DT
            n = int(self.rng.poisson(rate * self.DT))
            for _ in range(n):
                v = Vehicle(
                    vehicle_id=self._next_id(),
                    approach=approach,
                    arrival_time=self.t,
                )
                self.queues[approach].append(v)

    def _serve_vehicles(self, green_approaches: list[str]):
        """Serve vehicles from queues for green approaches."""
        for approach in green_approaches:
            # Number of vehicles we can serve this step
            can_serve = int(self.rng.poisson(self.config.service_rate * self.DT))
            for _ in range(can_serve):
                if not self.queues[approach]:
                    break
                v = self.queues[approach].popleft()
                v.compute_delay(self.t)
                self.last_green[approach] = self.t
                self.served_vehicles.append(v)

    def _advance_phase(self):
        """Transition to next phase state."""
        cfg = self.config
        current = self.phase

        current.time_in_state += self.DT

        if current.state == SignalState.GREEN:
            if current.time_in_state >= current.phase_green_duration:
                current.state = SignalState.YELLOW
                current.time_in_state = 0.0

        elif current.state == SignalState.YELLOW:
            if current.time_in_state >= current.yellow_duration:
                current.state = SignalState.ALL_RED
                current.time_in_state = 0.0

        elif current.state == SignalState.ALL_RED:
            if current.time_in_state >= current.all_red_duration:
                # Switch to next phase
                current.current_phase = current.next_phase()
                current.state = SignalState.GREEN
                current.time_in_state = 0.0
                current.cycle_count += 1
                # Get new green duration from controller
                if self.controller is not None:
                    durations = self.controller.compute_phase_durations(
                        queue_sizes=self._get_queue_sizes(),
                        waiting_times=self._get_max_waits(),
                        current_time=self.t,
                    )
                    current.phase_green_duration = durations.get(current.current_phase, 30.0)
                else:
                    current.phase_green_duration = float(
                        (cfg.min_green + cfg.max_green) / 2
                    )

    def _validate_phase_safety(self):
        """Check for simultaneous incompatible phases."""
        signals = self.phase.get_signals()
        green_approaches = [a for a, s in signals.items() if s == SignalState.GREEN.value]
        ns = set(["north", "south"])
        ew = set(["east", "west"])
        g_set = set(green_approaches)
        if g_set.issuperset(ns) and g_set.issuperset(ew):
            self.safety_violations += 1

    def _record_time_series(self):
        """Record state snapshot (every 10 seconds to limit memory)."""
        if int(self.t) % 10 == 0:
            self.time_series.append(
                TimeSeriesPoint(
                    t=self.t,
                    queues=self._get_queue_sizes(),
                    phase=self.phase.current_phase,
                    signals=self.phase.get_signals(),
                )
            )

    def run(self) -> SimulationResult:
        """Run the full simulation and return results."""
        start_wall = time.perf_counter()
        total_steps = int(self.config.duration / self.DT)
        all_queue_sums: list[float] = []
        max_queue = 0

        for step in range(total_steps):
            self.t = step * self.DT

            # 1. Generate arrivals
            self._generate_arrivals()

            # 2. Serve if green
            if self.phase.state == SignalState.GREEN:
                green_approaches = PHASE_APPROACHES.get(self.phase.current_phase, [])
                self._serve_vehicles(green_approaches)

            # 3. Advance phase state machine
            self._advance_phase()

            # 4. Safety check
            self._validate_phase_safety()

            # 5. Record metrics
            total_q = sum(len(q) for q in self.queues.values())
            all_queue_sums.append(float(total_q))
            if total_q > max_queue:
                max_queue = total_q

            self._record_time_series()

        computation_time = time.perf_counter() - start_wall

        # Compute result metrics
        delays = [v.delay for v in self.served_vehicles]
        avg_delay = float(np.mean(delays)) if delays else 0.0
        p95_delay = float(np.percentile(delays, 95)) if delays else 0.0
        avg_queue = float(np.mean(all_queue_sums)) if all_queue_sums else 0.0
        throughput = len(self.served_vehicles) / (self.config.duration / 3600.0)

        # Per-approach delays
        approach_delays: dict[str, float] = {}
        for approach in ALL_APPROACHES:
            veh = [v.delay for v in self.served_vehicles if v.approach == approach]
            approach_delays[approach] = float(np.mean(veh)) if veh else 0.0

        return SimulationResult(
            vehicles_served=len(self.served_vehicles),
            avg_delay=round(avg_delay, 2),
            p95_delay=round(p95_delay, 2),
            max_queue=max_queue,
            avg_queue=round(avg_queue, 2),
            throughput=round(throughput, 1),
            approach_delays={k: round(v, 2) for k, v in approach_delays.items()},
            safety_violations=self.safety_violations,
            computation_time=round(computation_time, 3),
            time_series=self.time_series,
            controller_type=self.config.controller_type,
            scenario=self.config.scenario,
            seed=self.config.seed,
        )
