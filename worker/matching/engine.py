from __future__ import annotations

from dataclasses import dataclass

KINDS = {"blocker", "barrier", "strength", "info"}
DECISIVE_FIELDS = ("title", "description", "deadline", "status", "level")
STRONG, POSSIBLE, WEAK = 45, 25, 10


@dataclass(frozen=True)
class Reason:
    kind: str
    rule_key: str
    message: str
    weight: int = 0

    def __post_init__(self):
        if self.kind not in KINDS:
            raise ValueError(f"bad reason kind: {self.kind}")
        if not self.message.strip():
            raise ValueError(f"reason {self.rule_key} has no message")


def score_call(call: dict, profile: dict, config: dict, rules) -> dict:
    reasons = [r for rule in rules for r in rule(call, profile, config)]
    blocked = any(r.kind == "blocker" for r in reasons)
    unknown_gate = any(r.kind == "barrier" for r in reasons)
    score = max(0, min(100, sum(r.weight for r in reasons)))

    if blocked:
        label = "not_recommended"
    elif score >= STRONG:
        label = "strong_fit"
    elif score >= POSSIBLE:
        label = "possible_fit"
    elif score >= WEAK:
        label = "weak_fit"
    else:
        label = "not_recommended"

    # Determine confidence level based on missing fields and unknown gates
    missing = [f for f in DECISIVE_FIELDS if f in call.get("missing_fields", ())]
    if unknown_gate or len(missing) >= 2:
        confidence = "low"
    elif missing:
        confidence = "medium"
    else:
        confidence = "high"

    return {
        "call_id": call["content_hash"],
        "title": call["title"],
        "score": score,
        "fit_label": label,
        "confidence": confidence,
        "has_blocking_barrier": blocked,
        "reasons": [vars(r) for r in reasons],
        "matched_themes": [r.rule_key.removeprefix("theme_")
                           for r in reasons if r.rule_key.startswith("theme_")],
    }
