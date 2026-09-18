from __future__ import annotations

import os
from pathlib import Path

import psycopg

from scrapers.pipeline.normalise import _parse_dates

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"

CALL_COLS = (
    "source source_url content_hash title summary description funding_body level funder_type "
    "status deadline_type amounts_kr eligibility ngo_eligible record_kind "
    "last_checked missing_fields completeness updated_at"
).split()

ROUND_COLS = ("call_id", "round_no", "deadline_date", "decision_date")

CALL_SQL = (
    f"insert into funding_call ({', '.join(CALL_COLS)}) "
    f"values ({', '.join(['%s'] * len(CALL_COLS))}) "
    "on conflict (source, source_url) do update set "
    + ", ".join(f"{c} = excluded.{c}" for c in CALL_COLS if c not in ("source", "source_url"))
)

ROUND_SQL = (
    f"insert into funding_round ({', '.join(ROUND_COLS)}) "
    f"values ({', '.join(['%s'] * len(ROUND_COLS))})"
)

SOURCE_SQL = """
insert into funding_source (key, name, source_type, last_checked)
values (%s, %s, %s, %s)
on conflict (key) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  last_checked = coalesce(excluded.last_checked, funding_source.last_checked)
"""


def dsn() -> str:
    if "DATABASE_URL" not in os.environ and ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            name, sep, value = line.partition("=")
            if sep and not name.lstrip().startswith("#"):
                os.environ.setdefault(name.strip(), value.strip().strip("\"'"))
    return os.environ["DATABASE_URL"]


def to_source(rec: dict) -> dict:
    return {"key": rec["source"], "name": rec.get("funding_body") or rec["source"],
            "source_type": rec.get("level"), "last_checked": rec.get("last_checked")}


def to_call(rec: dict) -> dict:
    row = {f: rec.get(f) for f in CALL_COLS}
    row["updated_at"] = rec["last_checked"]
    return row


def to_rounds(rec: dict, call_id: int) -> list[dict]:
    def one(cell: str | None) -> str | None:
        hits = _parse_dates(cell or "")
        return hits[0]["date"] if hits else None

    table = rec.get("deadline_table") or []
    if table:
        return [{"call_id": call_id, "round_no": n,
                 "deadline_date": one(row.get("submit")),
                 "decision_date": one(row.get("decided"))}
                for n, row in enumerate(table, 1)]
    return [{"call_id": call_id, "round_no": n, "deadline_date": d["date"], "decision_date": None}
            for n, d in enumerate(rec["past_deadlines"] + rec["deadlines"], 1)]


def store(records: list[dict], sources: list[dict] = ()) -> tuple[int, int]:
    source_rows = list(sources) or [to_source(r) for r in {r["source"]: r for r in records}.values()]
    if not source_rows:
        return 0, 0

    with psycopg.connect(dsn()) as conn, conn.cursor() as cur:
        cur.executemany(SOURCE_SQL, [[s["key"], s["name"], s["source_type"], s["last_checked"]]
                                     for s in source_rows])
        if not records:
            return 0, 0

        calls = [to_call(r) for r in records]
        cur.executemany(CALL_SQL, [[c[k] for k in CALL_COLS] for c in calls])

        keys = {(r["source"], r["source_url"]) for r in records}
        cur.execute("select id, source, source_url from funding_call where source = any(%s)",
                    [sorted({s for s, _ in keys})])
        by_url = {(s, u): i for i, s, u in cur.fetchall() if (s, u) in keys}

        rounds = [r for rec in records
                  for r in to_rounds(rec, by_url[(rec["source"], rec["source_url"])])]

        cur.execute("delete from funding_round where call_id = any(%s)", [list(by_url.values())])
        cur.executemany(ROUND_SQL, [[r[k] for k in ROUND_COLS] for r in rounds])

    return len(calls), len(rounds)
