import json
import re
from pathlib import Path

from matching.run import run
from matching.store import MATCH_COLS, MATCH_SQL, REASON_COLS, to_match, to_reasons
from tests.test_ground_truth import CALLS, PROFILE

RESULTS = run(CALLS, PROFILE)
MIGRATION = (Path(__file__).parent.parent.parent / "supabase/migrations"
             / "20260926120000_match_result.sql").read_text()


def test_every_result_maps_to_a_match_row():
    for result in RESULTS:
        row = to_match(result)
        assert set(row) == set(MATCH_COLS)
        assert 0 <= row["score"] <= 100
        assert row["fit_label"] in (
            "strong_fit", "possible_fit", "weak_fit", "not_recommended")


def test_reasons_carry_their_match_id_and_a_known_kind():
    rows = [r for result in RESULTS for r in to_reasons(result, 1)]
    assert rows
    for row in rows:
        assert set(row) == set(REASON_COLS)
        assert row["match_id"] == 1
        assert row["kind"] in ("blocker", "barrier", "strength", "info")
        assert row["rule_key"] and row["message"].strip()


def test_a_reviewed_match_is_never_overwritten():
    # The guard that makes a re-run skip overridden and dismissed rows.
    assert "where match_result.review_status = 'generated'" in MATCH_SQL


def test_columns_exist_in_the_migration():
    def columns(table: str) -> set[str]:
        body = re.search(rf"create table {table} \((.*?)\n\);", MIGRATION, re.S).group(1)
        return {m.group(1) for m in re.finditer(r"^\s{2}(\w+)\s+\w", body, re.M)}

    assert set(MATCH_COLS) <= columns("match_result")
    assert set(REASON_COLS) <= columns("match_reason")
