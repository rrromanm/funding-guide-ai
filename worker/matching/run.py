from __future__ import annotations

import json
from pathlib import Path

from matching.engine import score_call
from matching.rules import RULES

WORKER = Path(__file__).resolve().parent.parent


def run() -> list[dict]:
    records = json.loads((WORKER / "data/normalised.json").read_text())
    profile = json.loads((WORKER / "data/profile.json").read_text())
    config = {"themes": json.loads((WORKER / "matching/config/themes.json").read_text())}
    calls = [r for r in records if r["record_kind"] == "call"]
    return [score_call(call, profile, config, RULES) for call in calls]
