from __future__ import annotations
import json
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from matching.engine import score_call
from matching.rules import RULES
from matching.store import store_matches
from scrapers.pipeline.store import dsn

WORKER = Path(__file__).resolve().parent.parent

CONFIG = {"themes": json.loads((WORKER / "matching/config/themes.json").read_text())}

PROFILE_SQL = ("select name, municipality, has_facilities, staff_count, established_year, "
               "themes::text[] as themes from org_profile where id = 1")


def load_calls() -> list[dict]:
    with psycopg.connect(dsn(), row_factory=dict_row) as conn:
        return conn.execute(
            "select * from funding_call where record_kind = 'call' order by id"
        ).fetchall()


def load_profile() -> dict:
    with psycopg.connect(dsn(), row_factory=dict_row) as conn:
        return conn.execute(PROFILE_SQL).fetchone()


def run(calls: list[dict] | None = None, profile: dict | None = None) -> list[dict]:
    calls = load_calls() if calls is None else calls
    profile = load_profile() if profile is None else profile
    return [score_call(call, profile, CONFIG, RULES) for call in calls]


if __name__ == "__main__":
    results = run()
    matches, reasons = store_matches(results)
    print(f"stored {matches} matches, {reasons} reasons "
          f"({len(results) - matches} left to the admin's review)")
