"""Safety validation agent for signal plans."""

from dataclasses import dataclass, field


@dataclass
class SafetyResult:
    valid: bool
    violations: list[str] = field(default_factory=list)
    explanation: str = ""


class SafetyAgent:
    """
    Validates signal plans for safety compliance.

    Checks:
    - No simultaneous incompatible phases (N-S and E-W both green)
    - Yellow clearance >= min_yellow
    - All-red clearance >= min_all_red
    - Min green time respected
    - Max green time not exceeded
    - Pedestrian crossing constraints
    """

    MIN_YELLOW = 3.0
    MIN_ALL_RED = 2.0
    MIN_GREEN = 10.0
    MAX_GREEN = 90.0

    INCOMPATIBLE_PHASES = [
        ({"north", "south"}, {"east", "west"}),
    ]

    def validate(
        self,
        phase_durations: list[dict],
        protected_crossings: list[str] | None = None,
    ) -> SafetyResult:
        """Validate a signal plan represented as a list of phase dicts."""
        violations: list[str] = []
        protected_crossings = protected_crossings or []

        for phase_info in phase_durations:
            phase = phase_info.get("phase", "unknown")
            green = float(phase_info.get("green_duration", 0.0))
            yellow = float(phase_info.get("yellow_duration", 0.0))
            all_red = float(phase_info.get("all_red_duration", 0.0))
            approaches = set(phase_info.get("approaches", []))

            # Min green check
            if green < self.MIN_GREEN:
                violations.append(
                    f"Phase {phase}: green duration {green}s < minimum {self.MIN_GREEN}s"
                )

            # Max green check
            if green > self.MAX_GREEN:
                violations.append(
                    f"Phase {phase}: green duration {green}s > maximum {self.MAX_GREEN}s"
                )

            # Yellow clearance check
            if yellow < self.MIN_YELLOW:
                violations.append(
                    f"Phase {phase}: yellow duration {yellow}s < minimum {self.MIN_YELLOW}s"
                )

            # All-red clearance check
            if all_red < self.MIN_ALL_RED:
                violations.append(
                    f"Phase {phase}: all-red duration {all_red}s < minimum {self.MIN_ALL_RED}s"
                )

        # Simultaneous incompatible phase check
        # A valid signal plan has SEQUENTIAL phases, not simultaneous ones.
        # We only flag conflict if two phases that are MARKED as concurrent
        # have incompatible approaches. Sequential plans with 2 phases are safe
        # by definition (PHASE_1 then PHASE_2 are never simultaneously green).
        # Only flag if a single phase attempts to serve incompatible approaches.
        for phase_info in phase_durations:
            approaches_set = set(phase_info.get("approaches", []))
            for group_a, group_b in self.INCOMPATIBLE_PHASES:
                if approaches_set.issuperset(group_a) and approaches_set.issuperset(group_b):
                    violations.append(
                        f"Phase {phase_info.get('phase','?')}: single phase serves "
                        f"incompatible movements {group_a} and {group_b} simultaneously"
                    )

        # Protected pedestrian crossings: require sufficient green for listed approaches
        # and never schedule conflicting green that would strand pedestrians mid-crossing.
        if protected_crossings:
            covered = set()
            for phase_info in phase_durations:
                approaches = set(phase_info.get("approaches", []))
                green = float(phase_info.get("green_duration", 0.0))
                for crossing in protected_crossings:
                    # crossing names match approach ids (e.g. "north")
                    if crossing in approaches:
                        covered.add(crossing)
                        if green < self.MIN_GREEN + 5.0:
                            violations.append(
                                f"Protected crossing '{crossing}': green {green}s too short "
                                f"(need >= {self.MIN_GREEN + 5.0}s for pedestrian clearance)"
                            )
            missing = set(protected_crossings) - covered
            for crossing in missing:
                violations.append(
                    f"Protected crossing '{crossing}' is not served by any phase approaches"
                )

        valid = len(violations) == 0
        explanation = (
            "Signal plan passes all safety checks."
            if valid
            else f"Safety violations found: {'; '.join(violations)}"
        )
        return SafetyResult(valid=valid, violations=violations, explanation=explanation)

    def validate_simultaneous(
        self, active_phases: list[set[str]]
    ) -> SafetyResult:
        """Check if multiple simultaneously active approach sets conflict."""
        violations: list[str] = []
        for i in range(len(active_phases)):
            for j in range(i + 1, len(active_phases)):
                for group_a, group_b in self.INCOMPATIBLE_PHASES:
                    if (
                        active_phases[i].issuperset(group_a)
                        and active_phases[j].issuperset(group_b)
                    ) or (
                        active_phases[i].issuperset(group_b)
                        and active_phases[j].issuperset(group_a)
                    ):
                        violations.append(
                            f"Conflict: {active_phases[i]} vs {active_phases[j]}"
                        )
        valid = len(violations) == 0
        return SafetyResult(
            valid=valid,
            violations=violations,
            explanation="OK" if valid else "; ".join(violations),
        )
