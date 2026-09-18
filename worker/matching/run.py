from __future__ import annotations
import json
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from matching.engine import score_call
from matching.rules import RULES
from scrapers.pipeline.store import dsn

WORKER = Path(__file__).resolve().parent.parent
OUT = WORKER / "out/match_results.json"

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
    OUT.write_text(json.dumps(results, indent=2, ensure_ascii=False, default=str))
    print(f"scored {len(results)} calls -> {OUT}")
