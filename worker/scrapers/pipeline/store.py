from __future__ import annotations

import os
from pathlib import Path

import psycopg

from scrapers.pipeline.normalise import _parse_dates

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"

CALL_COLS = (
    "funding_source_id source_url title summary description funding_body level funder_type "
    "status eligibility ngo_eligible recurring budget_min budget_max currency external_id updated_at"
).split()

ROUND_COLS = ("call_id", "round_no", "open_date", "deadline_date", "decision_date")

CALL_SQL = (
    f"insert into funding_call ({', '.join(CALL_COLS)}) "
    f"values ({', '.join(['%s'] * len(CALL_COLS))}) "
    "on conflict (funding_source_id, source_url) do update set "
    + ", ".join(f"{c} = excluded.{c}" for c in CALL_COLS
                if c not in ("funding_source_id", "source_url"))
    + " where funding_call.edited_at is null"
)

ROUND_SQL = (
    f"insert into funding_round ({', '.join(ROUND_COLS)}) "
    f"values ({', '.join(['%s'] * len(ROUND_COLS))})"
)

SOURCE_SQL = """
insert into funding_source (name, source_type, base_url, last_checked)
values (%s, %s, %s, %s)
on conflict (name) do update set
  source_type = excluded.source_type,
  base_url = coalesce(excluded.base_url, funding_source.base_url),
  last_checked = coalesce(excluded.last_checked, funding_source.last_checked)
returning id
"""

TAG_SQL = ("insert into funding_call_tag (call_id, tag_id) "
           "select %s, id from tag where type = %s::tag_type and label = any(%s)")

# What enrich() reuses when a call's description hasn't changed since the last run.
STORED_SQL = """
select c.source_url, c.description, c.status, c.eligibility, c.ngo_eligible,
       c.budget_min, c.budget_max, c.currency,
       array(select t.label from funding_call_tag ct join tag t on t.id = ct.tag_id
             where ct.call_id = c.id and t.type = 'theme'),
       array(select t.label from funding_call_tag ct join tag t on t.id = ct.tag_id
             where ct.call_id = c.id and t.type = 'target_group'),
       array(select json_build_object('submit', r.deadline_date, 'decided', r.decision_date,
                                      'opens', r.open_date)
             from funding_round r where r.call_id = c.id order by r.round_no)
from funding_call c where c.source_url = any(%s)
"""


def dsn() -> str:
    if "DATABASE_URL" not in os.environ and ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            name, sep, value = line.partition("=")
            if sep and not name.lstrip().startswith("#"):
                os.environ.setdefault(name.strip(), value.strip().strip("\"'"))
    return os.environ["DATABASE_URL"]


def vocabulary() -> tuple[list[str], list[str]]:
    """(themes, target groups): the tag labels a call may be tagged with."""
    with psycopg.connect(dsn()) as conn:
        tags = dict(conn.execute(
            "select type::text, array_agg(label order by label) from tag group by type").fetchall())
    return tags.get("theme", []), tags.get("target_group", [])


def stored_calls(urls: list[str]) -> dict[str, dict]:
    with psycopg.connect(dsn()) as conn:
        rows = conn.execute(STORED_SQL, [urls]).fetchall()
    return {url: {"description": desc, "eligibility": eligibility,
                  "fields": {"eligibility": eligibility, "ngo_eligible": ngo, "budget_min": low,
                             "budget_max": high, "currency": currency, "themes": themes,
                             "target_groups": groups},
                  # rolling isn't stored; an open call without rounds can only be one
                  "rounds": rounds, "rolling": status == "open" and not rounds}
            for url, desc, status, eligibility, ngo, low, high, currency, themes, groups, rounds in rows}


def to_source(rec: dict) -> dict:
    return {"key": rec["source"], "name": rec.get("funding_body") or rec["source"],
            "source_type": rec.get("level"), "last_checked": rec.get("last_checked")}


def to_call(rec: dict, source_id: int | None = None) -> dict:
    row = {f: rec.get(f) for f in CALL_COLS}
    row["funding_source_id"] = source_id
    row["currency"] = rec.get("currency") or "DKK"
    row["recurring"] = bool(rec.get("recurring")) or rec.get("deadline_type") == "multi_round"
    row["updated_at"] = rec["last_checked"]
    return row


def to_rounds(rec: dict, call_id: int) -> list[dict]:
    def one(cell: str | None) -> str | None:
        hits = _parse_dates(cell or "")
        return hits[0]["date"] if hits else None

    return [{"call_id": call_id, "round_no": n,
             "open_date": one(row.get("opens")),
             "deadline_date": one(row.get("submit")),
             "decision_date": one(row.get("decided"))}
            for n, row in enumerate(rec.get("deadline_table") or [], 1)]


def store(records: list[dict], sources: list[dict] = ()) -> tuple[int, int]:
    records = [r for r in records if r.get("record_kind") != "info_page"]
    source_rows = list(sources) or [to_source(r) for r in {r["source"]: r for r in records}.values()]
    if not source_rows:
        return 0, 0

    with psycopg.connect(dsn()) as conn, conn.cursor() as cur:
        source_ids = {}
        for s in source_rows:
            cur.execute(SOURCE_SQL, [s["name"], s["source_type"], s.get("base_url"),
                                     s["last_checked"]])
            source_ids[s["key"]] = cur.fetchone()[0]

        if not records:
            return 0, 0

        calls = [to_call(r, source_ids[r["source"]]) for r in records]
        cur.executemany(CALL_SQL, [[c[k] for k in CALL_COLS] for c in calls])

        keys = {(source_ids[r["source"]], r["source_url"]) for r in records}
        cur.execute("select id, funding_source_id, source_url from funding_call "
                    "where funding_source_id = any(%s) and edited_at is null",
                    [sorted({s for s, _ in keys})])
        by_url = {(s, u): i for i, s, u in cur.fetchall() if (s, u) in keys}
        records = [rec for rec in records if (source_ids[rec["source"]], rec["source_url"]) in by_url]

        rounds = [r for rec in records
                  for r in to_rounds(rec, by_url[(source_ids[rec["source"]], rec["source_url"])])]

        cur.execute("delete from funding_round where call_id = any(%s)", [list(by_url.values())])
        cur.executemany(ROUND_SQL, [[r[k] for k in ROUND_COLS] for r in rounds])

        cur.execute("delete from funding_call_tag where call_id = any(%s)", [list(by_url.values())])
        cur.executemany(TAG_SQL, [[by_url[(source_ids[rec["source"]], rec["source_url"])], kind, rec.get(field) or []]
                                  for rec in records
                                  for kind, field in (("theme", "themes"), ("target_group", "target_groups"))])

    return len(calls), len(rounds)
