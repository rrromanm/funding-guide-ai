from __future__ import annotations

import json
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from matching.engine import score_call
from matching.rules import RULES
from scrapers.pipeline.store import dsn

WORKER = Path(__file__).resolve().parent.parent

PROFILE_SQL = ("select name, municipality, has_facilities, staff_count, established_year, "
               "themes::text[] as themes from org_profile where id = 1")


def load_profile() -> dict:
    with psycopg.connect(dsn(), row_factory=dict_row) as conn:
        return conn.execute(PROFILE_SQL).fetchone()


def run(profile: dict | None = None) -> list[dict]:
    records = json.loads((WORKER / "data/normalised.json").read_text())
    profile = profile or load_profile()
    config = {"themes": json.loads((WORKER / "matching/config/themes.json").read_text())}
    calls = [r for r in records if r["record_kind"] == "call"]
    return [score_call(call, profile, config, RULES) for call in calls]
