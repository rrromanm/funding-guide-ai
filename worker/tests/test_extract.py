from scrapers.pipeline import extract as ex

TEXT = ("Puljen kan søges af foreninger med et almennyttigt formål. "
        "Der kan søges op til 150.000 kroner pr. ansøgning. "
        "Ansøgningsfrister: 18. januar 2026 til behandling i udvalget 14. april 2026.")
REC = {"title": "Testpuljen", "summary": None, "description": TEXT, "deadline_table": []}


def answer(**overrides) -> dict:
    """A model reply whose quotes are all in TEXT."""
    return {"eligibility": {"summary": "Nonprofit associations.",
                            "evidence": "Puljen kan søges af foreninger med et almennyttigt formål."},
            "ngo_eligible": {"answer": "yes", "evidence": "foreninger med et almennyttigt formål"},
            "rolling": {"answer": "no", "evidence": None},
            "budget": {"min": None, "max": 150000,
                       "evidence": "Der kan søges op til 150.000 kroner pr. ansøgning."},
            "themes": ["youth", "not-a-tag"], "target_groups": [], **overrides}


def test_quoted_values_are_kept(monkeypatch):
    monkeypatch.setattr(ex, "gemini_json", lambda prompt, schema: answer())
    fields, _ = ex.extract(REC, ["youth"], [])
    assert (fields["eligibility"], fields["ngo_eligible"]) == ("Nonprofit associations.", True)
    assert (fields["budget_min"], fields["budget_max"], fields["currency"]) == (None, 150000, "DKK")
    assert fields["themes"] == ["youth"]  # a label outside the vocabulary is dropped


def test_an_unquoted_value_or_an_amount_not_in_its_quote_is_dropped(monkeypatch):
    monkeypatch.setattr(ex, "gemini_json", lambda prompt, schema: answer(
        eligibility={"summary": "Anyone.", "evidence": "Alle kan søge."},
        rolling={"answer": "yes", "evidence": "Søg løbende."},
        budget={"min": None, "max": 200000,
                "evidence": "Der kan søges op til 150.000 kroner pr. ansøgning."}))
    fields, _ = ex.extract(REC, ["youth"], [])
    assert fields["eligibility"] is None and fields["rolling"] is False
    assert (fields["budget_max"], fields["currency"]) == (None, None)


def test_grounding_ignores_case_quote_marks_and_spacing():
    assert ex.grounded("“Puljen  KAN søges”", "puljen kan søges af foreninger")
    assert not ex.grounded("", "puljen kan søges")


def test_amounts_in_danish_notation():
    assert ex._amounts_in("op til 150.000 kroner") == {150000}
    assert ex._amounts_in("49,2 mio. kr. årligt") == {49200000}
    assert ex._amounts_in("30.000 EUR 60.000 EUR") == {30000, 60000}


def test_rounds_can_only_point_at_parsed_dates(monkeypatch):
    schemas = []

    def fake(prompt, schema):
        schemas.append(schema)
        return {"rounds": [{"deadline": "d1", "decision": "d2", "opens": "none"}]}

    monkeypatch.setattr(ex, "gemini_json", fake)
    assert ex.free_text_rounds(ex.date_candidates(TEXT)) == [
        {"deadline_date": "2026-01-18", "decision_date": "2026-04-14", "open_date": None}]
    assert schemas[0]["properties"]["rounds"]["items"]["properties"]["deadline"]["enum"] == ["d1", "d2"]


def test_enrich_reuses_an_unchanged_call_and_asks_about_a_changed_one(monkeypatch):
    rounds = [{"submit": "2026-01-18", "decided": "2026-04-14", "opens": None}]
    stored = {"https://a": {"description": TEXT, "eligibility": "Stored.", "rounds": rounds,
                            "rolling": False, "fields": {"eligibility": "Stored.", "themes": []}}}
    monkeypatch.setattr(ex, "vocabulary", lambda: (["youth"], []))
    monkeypatch.setattr(ex, "stored_calls", lambda urls: stored)
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    prompts = []

    def fake(prompt, schema):
        prompts.append(prompt)
        if "rounds" in schema["properties"]:
            return {"rounds": [{"deadline": "d1", "decision": "d2", "opens": "none"}]}
        return answer()

    monkeypatch.setattr(ex, "gemini_json", fake)
    same = {**REC, "source_url": "https://a"}
    changed = {**REC, "source_url": "https://b", "description": TEXT + " Nyt i år."}
    ex.enrich([same, changed])

    assert (same["eligibility"], same["deadline_table"]) == ("Stored.", rounds)
    assert len(prompts) == 2  # fields + rounds, for the changed call only
    assert changed["eligibility"] == "Nonprofit associations."
    assert changed["deadline_table"] == rounds
