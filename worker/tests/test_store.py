from datetime import date

from scrapers.pipeline.normalise import normalise
from scrapers.pipeline.run import dedupe
from scrapers.pipeline.store import CALL_COLS, ROUND_COLS, to_call, to_rounds
from tests.schema import columns

BODY = "Du kan søge op til 150.000 kr. " + "x" * 500
SEEN = {"source": "horsens", "last_checked": "2026-01-01T00:00:00+00:00"}
RAW = [
    {**SEEN, "title": "Prosepuljen", "source_url": "https://horsens.dk/a",
     "description": BODY + " Ansøgningsfrist er 1. april 2026 og 1. september 2026."},
    {**SEEN, "title": "Tabelpuljen", "source_url": "https://horsens.dk/b",
     "description": BODY,
     "deadline_table": [{"submit": "1. april 2025", "decided": "1. juni 2025"},
                        {"submit": "1. april 2026", "decided": "1. juni 2026"}]},
    {**SEEN, "title": "Tabelpuljen", "source_url": "https://horsens.dk/b-copy",
     "description": BODY,
     "deadline_table": [{"submit": "1. april 2025", "decided": "1. juni 2025"},
                        {"submit": "1. april 2026", "decided": "1. juni 2026"}]},
]
RECORDS = dedupe(normalise(RAW, today=date(2026, 1, 1)))

def test_every_record_maps_to_a_call_row():
    for rec in RECORDS:
        row = to_call(rec, source_id=1)
        assert row["title"] and row["funding_source_id"] == 1
        assert row["status"] in ("upcoming", "open", "closed", "unknown")
        assert row["level"] in (None, "local", "municipal", "regional", "national", "nordic", "eu")
        assert row["funder_type"] in (None, "public_pool", "foundation", "eu_programme", "other")


def test_amounts_become_a_budget_range():
    row = to_call(RECORDS[0], source_id=1)
    assert (row["budget_min"], row["budget_max"]) == (150000, 150000)


def test_a_cycle_of_rounds_is_recurring():
    by_title = {r["title"]: to_call(r, source_id=1) for r in RECORDS}
    assert by_title["Prosepuljen"]["recurring"] is True  
    assert by_title["Tabelpuljen"]["recurring"] is True  


def test_rounds_carry_both_dates_and_unique_numbers():
    rows = [r for rec in RECORDS for r in to_rounds(rec, 1)]
    assert rows
    for rec in RECORDS:
        nos = [r["round_no"] for r in to_rounds(rec, 1)]
        assert len(nos) == len(set(nos))
    assert any(r["decision_date"] for r in rows)


def test_columns_exist_in_the_schema():
    assert set(CALL_COLS) <= columns("funding_call")
    assert set(ROUND_COLS) <= columns("funding_round")
    assert {"name", "source_type", "last_checked"} <= columns("funding_source")
