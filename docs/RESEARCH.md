# PULSE Research Background

## Problem Domain

### Urban Traffic Signal Control

Traffic signal control is a combinatorial optimization problem with real-time constraints. A four-way intersection has multiple competing phases (North-South, East-West, turning movements) that cannot run simultaneously without conflict. The goal is to allocate green time to each phase to minimize aggregate delay while satisfying hard safety constraints.

### Why Existing Approaches Fall Short

| Approach | Limitation |
|----------|-----------|
| Fixed-timing plans | Cannot adapt to dynamic demand; wastes green time during low flow |
| Actuated control (loop detectors) | Reacts to individual vehicles; no predictive capability |
| SCOOT / SCATS (adaptive) | Infrastructure-heavy; requires extensive sensor networks |
| Reinforcement learning | Black-box decisions; difficult to audit or override |
| Pure optimization | No human policy input; may optimize against operator intent |

### PULSE's Contribution

PULSE introduces **human-in-the-loop intent-driven optimization**, where:
1. The human operator expresses *policy intent* (priorities, fairness preferences)
2. The AI translates intent into mathematically optimal signal timings
3. A safety agent validates all plans before execution
4. The human retains final authority to accept or reject

This separates *what to optimize for* (human judgment) from *how to optimize* (machine computation).

---

## Theoretical Foundations

### Queue Theory (M/D/1 Model)

PULSE's simulation uses a simplified M/D/1 queuing model:
- **M**: Poisson arrivals (memoryless inter-arrival times)
- **D**: Deterministic service time (fixed saturation flow rate)
- **1**: Single server per approach (one phase at a time)

Under this model, the expected queue length at time *t* is:

```
E[Q(t)] = λ_arrival × t_red - λ_service × t_green  (simplified)
```

Where:
- λ_arrival = vehicle arrival rate (vehicles/second)
- t_red = time since last green for this approach
- λ_service = saturation flow rate (vehicles/second during green)

### Webster's Optimal Cycle Length (Reference)

Webster (1958) derived the theoretically optimal signal cycle length:

```
C_opt = (1.5L + 5) / (1 - Y)
```

Where:
- L = total lost time per cycle (yellow + all-red clearances)
- Y = sum of critical phase flow ratios (volume / saturation flow)

PULSE does not directly implement Webster's formula (it uses intent-weighted scoring), but this provides a theoretical baseline for comparison.

### Jain's Fairness Index

To measure how equitably green time is distributed across approaches:

```
J(x₁, x₂, ..., xₙ) = (Σxᵢ)² / (n × Σxᵢ²)
```

- J = 1.0: Perfect fairness (all approaches receive equal relative service)
- J → 1/n: Maximum unfairness (one approach receives all service)

PULSE reports fairness on delay distributions, not green-time allocations.

---

## Related Work

### Adaptive Signal Control Systems

**SCOOT (Split Cycle Offset Optimization Technique)**
- Rhodes, B.H. et al. (1980). SCOOT — a traffic responsive method of coordinating signals.
- Uses loop detectors to continuously optimize splits, cycle lengths, and offsets
- Infrastructure cost prohibitive for developing regions

**SCATS (Sydney Coordinated Adaptive Traffic System)**
- Sims, A.G. & Dobinson, K.W. (1980). The Sydney coordinated adaptive traffic (SCAT) system — philosophy and field experience.
- Similar to SCOOT; deployed in 100+ cities

**InSync (Rhythm Engineering)**
- Uses video detection rather than loop detectors
- Commercially deployed; not open-source

### Reinforcement Learning Approaches

**PRESSLIGHT**
- Wei, H. et al. (2019). PressLight: Learning Max Pressure Control to Coordinate Traffic Signals in Arterial Network.
- Uses pressure-based RL; shown improvements over fixed timing
- Limitation: requires training on each intersection configuration

**CoLight**
- Wei, H. et al. (2019). CoLight: Learning Network-level Cooperation for Traffic Signal Control.
- Multi-agent RL with attention mechanism for coordination
- Not interpretable; difficult to audit decisions

**Limitation of RL approaches**: Reward functions implicitly encode priorities; PULSE makes these explicit through the Intent Profile.

### Computer Vision for Traffic

**YOLOv8 (Ultralytics, 2023)**
- Jocher, G., Chaurasia, A., & Qiu, J. (2023). Ultralytics YOLO.
- Real-time object detection suitable for edge deployment
- PULSE uses YOLOv8n (nano) for CPU-compatible inference

**ByteTrack**
- Zhang, Y. et al. (2022). ByteTrack: Multi-Object Tracking by Associating Every Detection Box.
- PULSE implements a simplified ByteTrack-inspired tracker for vehicle ID stability

---

## PULSE Novelty Claims

1. **Traffic Intent Sculpting™**: No prior system provides a visual, priority-weight-based interface for operators to express signal optimization policy in real time.

2. **Explainable Plan Generation**: PULSE generates natural-language explanations for every signal plan, attributing phase lengths to specific demand and intent factors.

3. **Safety-First Architecture**: The Safety Agent is architecturally decoupled from the optimizer, ensuring constraint validation cannot be bypassed by the optimization process.

4. **Graceful Degradation**: PULSE operates in full mock mode when ML dependencies are unavailable, enabling demonstration without hardware or network requirements.

---

## Simulation Validity

### What PULSE's Simulation Captures
- Stochastic vehicle arrivals (Poisson process)
- Phase-dependent service (vehicles served only during green)
- Queue accumulation and dissipation dynamics
- Controller behavior differences across 3 algorithms

### What It Does NOT Capture
- Driver behavior heterogeneity (aggressive vs. conservative)
- Vehicle type mix effects on saturation flow
- Pedestrian-vehicle interactions
- Spillback effects from downstream intersections
- Weather and visibility conditions
- Emergency vehicle preemption

### Recommended Extensions for Higher Fidelity
- **SUMO** (Simulation of Urban MObility): Open-source microscopic traffic simulator
- **VISSIM** (PTV Group): Commercial microsimulation (industry standard)
- **CARLA**: Autonomous driving simulator with realistic rendering

---

## References

1. Webster, F.V. (1958). *Traffic signal settings*. Road Research Technical Paper No. 39. HMSO, London.
2. Newell, G.F. (1982). *Applications of Queueing Theory*. Chapman and Hall.
3. Jocher, G. et al. (2023). *Ultralytics YOLOv8*. https://github.com/ultralytics/ultralytics
4. Zhang, Y. et al. (2022). ByteTrack: Multi-Object Tracking by Associating Every Detection Box. ECCV 2022.
5. Wei, H. et al. (2019). PressLight: Learning Max Pressure Control to Coordinate Traffic Signals in Arterial Network. KDD 2019.
6. Jain, R., Chiu, D., & Hawe, W. (1984). *A quantitative measure of fairness and discrimination for resource allocation in shared computer system*. DEC Technical Report.
7. Lin, T.Y. et al. (2014). Microsoft COCO: Common Objects in Context. ECCV 2014.
