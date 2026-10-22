from datetime import date

from scrapers.pipeline.normalise import _parse_dates, normalise

TODAY = date(2026, 1, 1)
BODY = "Søg støtte til jeres projekt. " + "x" * 500

SAMPLE = {
    "title": "Testpuljen",
    "summary": "Søg støtte.",
    "description": BODY,
    "deadline_table": [],
    "source_url": "https://horsens.dk/test",
}


def norm(**overrides) -> dict:
    return normalise([dict(SAMPLE, **overrides)], today=TODAY)[0]


def test_record_kind():
    assert norm()["record_kind"] == "call"
    assert norm(description="Søg støtte.")["record_kind"] == "stub"
    assert norm(summary=None,
                description="Vi understøtter besøg og undersøgelser. " + "x" * 500,
                )["record_kind"] == "info_page"


def test_free_text_dates_are_not_read_here():
    r = norm(description=BODY + " Ansøgningsfrist er 1. april 2026. Søg løbende hele året.")
    assert (r["deadlines"], r["deadline_type"], r["status"]) == ([], "unknown", "unknown")


def test_deadline_table_keeps_past_rounds():
    r = norm(deadline_table=[{"submit": "1. april 2025"}, {"submit": "1. april 2026"}])
    assert [d["date"] for d in r["deadlines"]] == ["2026-04-01"]
    assert [d["date"] for d in r["past_deadlines"]] == ["2025-04-01"]
    assert r["deadline_type"] == "multi_round"
    assert norm(deadline_table=[{"submit": "1. april 2026"}])["deadline_type"] == "fixed"


def test_rounds_built_from_free_text():
    r = norm(deadline_table=[{"submit": "2025-08-10", "decided": "2025-10-09"},
                             {"submit": "2026-08-14", "decided": "2026-10-05"}])
    assert (r["deadline_type"], r["status"]) == ("multi_round", "open")


def test_rolling():
    assert (norm(rolling=True)["deadline_type"], norm(rolling=True)["status"]) == ("rolling", "open")
    assert norm(deadline_table=[{"submit": "Løbende"}])["status"] == "open"
    r = norm(description="Søg støtte. Der afholdes løbende arrangementer. " + "x" * 500,
             deadline_table=[{"submit": "1. april 2025"}])
    assert (r["deadline_type"], r["status"]) == ("fixed", "closed")


def test_status_distinguishes_expired_from_open():
    assert norm(deadline_table=[{"submit": "1. april 2026"}])["status"] == "open"
    assert norm(deadline_table=[{"submit": "1. april 2025"}])["status"] == "closed"
    assert norm()["status"] == "unknown"


def test_date_formats():
    for text in ("Deadline 1 April 2026", "Deadline April 1, 2026", "by 2026-04-01",
                 "Ansøgningsfrist: 1. april 2026 kl. 12.00", "24.09.2026, kl. 14:00"):
        assert len(_parse_dates(text)) == 1, text
    assert _parse_dates("1. april 2026 til behandling i udvalget 14. april 2026") == [
        {"raw": "1. april 2026", "date": "2026-04-01"}, {"raw": "14. april 2026", "date": "2026-04-14"}]
