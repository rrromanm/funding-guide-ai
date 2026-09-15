from datetime import date

from scrapers.pipeline.normalise import FIELD_CHECKS, normalise

TODAY = date(2026, 1, 1)

SAMPLE = {
    "title": "Testpuljen",
    "summary": "Søg støtte.",
    "description": "Du kan søge op til 150.000 kr. Ansøgningsfrist er 1. april 2026. "
                   "Nye retningslinjer fra 1. maj 2024. " + "x" * 500,
    "deadline_table": [],
    "source_url": "https://horsens.dk/test",
}


def norm(**overrides) -> dict:
    """One normalised record built from SAMPLE with the given fields replaced."""
    return normalise([dict(SAMPLE, **overrides)], today=TODAY)[0]


def test_record_kind():
    assert norm()["record_kind"] == "call"
    assert norm(description="Søg støtte.")["record_kind"] == "stub"
    assert norm(summary=None,
                description="Vi understøtter besøg og undersøgelser. " + "x" * 500,
                )["record_kind"] == "info_page"


def test_prose_drops_past_reference_dates():
    r = norm()
    assert r["deadlines"] == [{"raw": "1. april 2026", "date": "2026-04-01"}]
    assert r["past_deadlines"] == []
    assert r["deadline_type"] == "fixed"


def test_deadline_table_keeps_past_rounds():
    r = norm(deadline_table=[{"submit": "1. april 2025"}, {"submit": "1. april 2026"}])
    assert [d["date"] for d in r["deadlines"]] == ["2026-04-01"]
    assert [d["date"] for d in r["past_deadlines"]] == ["2025-04-01"]
    assert r["deadline_type"] == "multi_round"
    assert norm(deadline_table=[{"submit": "1. april 2026"}])["deadline_type"] == "fixed"


def test_cycle_detection():
    assert norm(description=SAMPLE["description"] + " og 1. september 2026.",
                )["deadline_type"] == "multi_round"
    assert norm(description="Søg løbende hele året. " + "x" * 500,
                )["deadline_type"] == "rolling"
    assert norm(description="Søg løbende. Frist 1. april 2026. " + "x" * 500,
                )["deadline_type"] == "unknown"


def test_status_distinguishes_expired_from_open():
    assert norm()["status"] == "open"
    assert norm(description="Søg løbende hele året. " + "x" * 500)["status"] == "open"
    assert norm(deadline_table=[{"submit": "1. april 2025"}])["status"] == "closed"
    assert norm(description="Søg støtte. Fristen var 1. april 2020. " + "x" * 500,
                )["status"] == "unknown"


def test_multi_language_dates():
    for desc in ("Apply for funding. Deadline 1 April 2026. ",
                 "Call for proposals. Deadline April 1, 2026. ",
                 "Apply for a grant by 2026-04-01. "):
        r = norm(description=desc + "x" * 500)
        assert r["record_kind"] == "call", desc
        assert [d["date"] for d in r["deadlines"]] == ["2026-04-01"], desc


def test_amounts():
    assert norm()["amounts_kr"] == [150000]


def test_content_hash_ignores_url():
    assert norm(source_url="https://horsens.dk/other#frag")["content_hash"] \
        == norm()["content_hash"]


def test_completeness_reports_gaps():
    r = norm()
    assert "eligibility_conditions" in r["missing_fields"]
    assert "ngo_eligible" in r["missing_fields"]
    assert "deadline" not in r["missing_fields"]
    assert "status" not in r["missing_fields"]
    assert r["completeness"] == round(1 - len(r["missing_fields"]) / len(FIELD_CHECKS), 2)
