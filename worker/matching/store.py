from __future__ import annotations

import psycopg

from scrapers.pipeline.store import dsn

MATCH_COLS = ("call_id", "score", "fit_label")
REASON_COLS = ("match_id", "kind", "message", "weight")

MATCH_SQL = (
    f"insert into match_result ({', '.join(MATCH_COLS)}) "
    f"values ({', '.join(['%s'] * len(MATCH_COLS))}) "
    "on conflict (call_id) do update set "
    + ", ".join(f"{c} = excluded.{c}" for c in MATCH_COLS if c != "call_id")
    + ", updated_at = now()"
    + " where match_result.review_status = 'generated' "
    "returning id"
)

REASON_SQL = (
    f"insert into match_reason ({', '.join(REASON_COLS)}) "
    f"values ({', '.join(['%s'] * len(REASON_COLS))})"
)


def to_match(result: dict) -> dict:
    return {c: result[c] for c in MATCH_COLS}


def to_reasons(result: dict, match_id: int) -> list[dict]:
    return [{"match_id": match_id, **{c: r[c] for c in REASON_COLS[1:]}}
            for r in result["reasons"]]


def store_matches(results: list[dict]) -> tuple[int, int]:
    matches = reasons = 0
    with psycopg.connect(dsn()) as conn, conn.cursor() as cur:
        for result in results:
            row = to_match(result)
            cur.execute(MATCH_SQL, [row[c] for c in MATCH_COLS])
            written = cur.fetchone()
            if written is None:
                continue
            match_id = written[0]
            cur.execute("delete from match_reason where match_id = %s", [match_id])
            rows = to_reasons(result, match_id)
            cur.executemany(REASON_SQL, [[r[c] for c in REASON_COLS] for r in rows])
            matches += 1
            reasons += len(rows)
    return matches, reasons
