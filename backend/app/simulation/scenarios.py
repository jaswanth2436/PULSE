"""Predefined reproducible simulation scenarios."""

from app.schemas.simulation import SimulationConfig


SCENARIOS: dict[str, SimulationConfig] = {
    # Scenario A: Balanced - all approaches equal
    "A": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 300.0, "south": 300.0, "east": 300.0, "west": 300.0},
        seed=42,
        scenario="A",
    ),
    # Scenario B: Eastbound heavy congestion
    "B": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 200.0, "south": 200.0, "east": 600.0, "west": 200.0},
        seed=123,
        scenario="B",
    ),
    # Scenario C: N-S corridor congestion
    "C": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 500.0, "south": 500.0, "east": 150.0, "west": 150.0},
        seed=456,
        scenario="C",
    ),
    # Scenario D: Surge (all start low, spike to 800 after 1200s)
    "D": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 200.0, "south": 200.0, "east": 200.0, "west": 200.0},
        seed=789,
        scenario="D",
    ),
    # Aliases
    "balanced": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 300.0, "south": 300.0, "east": 300.0, "west": 300.0},
        seed=42,
        scenario="A",
    ),
    "east_heavy": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 200.0, "south": 200.0, "east": 600.0, "west": 200.0},
        seed=123,
        scenario="B",
    ),
    "ns_heavy": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 500.0, "south": 500.0, "east": 150.0, "west": 150.0},
        seed=456,
        scenario="C",
    ),
    "surge": SimulationConfig(
        duration=3600,
        arrival_rates={"north": 200.0, "south": 200.0, "east": 200.0, "west": 200.0},
        seed=789,
        scenario="D",
    ),
}


def get_scenario(name: str) -> SimulationConfig:
    """Return scenario config by name (A-D or full name)."""
    key = name.upper() if name.upper() in SCENARIOS else name.lower()
    if key not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {name}. Valid: {list(SCENARIOS.keys())}")
    return SCENARIOS[key].model_copy(deep=True)
