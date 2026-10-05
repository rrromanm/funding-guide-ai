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

PROFILE_SQL = """
select p.name, p.city, p.staff_count,
       coalesce(array_agg(t.label) filter (where t.type = 'theme'), '{}') as themes,
       coalesce(bool_or(t.type = 'other' and t.label = 'facilities'), false) as has_facilities
from org_profile p
left join org_profile_tag pt on pt.org_profile_id = p.id
left join tag t on t.id = pt.tag_id
where p.id = 1
group by p.name, p.city, p.staff_count
"""

CALLS_SQL = """
select c.*,
       (select min(r.deadline_date) from funding_round r
        where r.call_id = c.id and r.deadline_date >= current_date) as deadline
from funding_call c
order by c.id
"""


def load_calls() -> list[dict]:
    with psycopg.connect(dsn(), row_factory=dict_row) as conn:
        return conn.execute(CALLS_SQL).fetchall()


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
