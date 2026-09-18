import json
from pathlib import Path

from scrapers.pipeline.store import CALL_COLS, ROUND_COLS, to_call, to_rounds

RECORDS = json.loads((Path(__file__).parent.parent / "data/normalised.json").read_text())

def test_every_record_maps_to_a_call_row():
    for rec in RECORDS:
        row = to_call(rec)
        assert row["title"] and row["source"] and row["content_hash"]
        assert row["status"] in ("upcoming", "open", "closed", "unknown")
        assert row["deadline_type"] in ("fixed", "multi_round", "rolling", "unknown")
        assert row["record_kind"] in ("call", "stub", "info_page")
        assert row["level"] in (None, "local", "municipal", "regional", "national", "nordic", "eu")
        assert row["funder_type"] in (None, "public_pool", "foundation", "eu_programme", "other")


def test_rounds_carry_both_dates_and_unique_numbers():
    rows = [r for rec in RECORDS for r in to_rounds(rec, 1)]
    assert rows
    for rec in RECORDS:
        nos = [r["round_no"] for r in to_rounds(rec, 1)]
        assert len(nos) == len(set(nos))
    assert any(r["decision_date"] for r in rows)


def test_columns_exist_in_the_migration():
    import re

    sql = (Path(__file__).parent.parent.parent / "supabase/migrations"
           / "20260916090000_funding_calls.sql").read_text()

    def columns(table: str) -> set[str]:
        body = re.search(rf"create table {table} \((.*?)\n\);", sql, re.S).group(1)
        return {m.group(1) for m in re.finditer(r"^\s{2}(\w+)\s+\w", body, re.M)}

    assert set(CALL_COLS) <= columns("funding_call")
    assert set(ROUND_COLS) <= columns("funding_round")
    assert {"key", "name", "source_type", "last_checked"} <= columns("funding_source")
