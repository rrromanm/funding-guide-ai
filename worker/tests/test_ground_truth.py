from matching.run import run

RESULTS = {r["call_id"]: r for r in run()}


def _all(fragment: str) -> list[dict]:
    hits = [r for r in RESULTS.values() if fragment in r["title"]]
    assert hits, f"no matched call titled like {fragment!r}"
    return hits


def _one(fragment: str) -> dict:
    return _all(fragment)[0]


def test_strong_or_possible_fits():
    assert _one("Studielivspuljen")["fit_label"] in ("strong_fit", "possible_fit")
    assert _one("Kultur- og Oplevelsespuljen")["fit_label"] in ("strong_fit", "possible_fit")
    assert _one("Udviklings- og aktivitetspuljen")["fit_label"] in ("strong_fit", "possible_fit")


def test_homeowner_and_facility_pools_blocked():
    for r in _all("renovering af din bolig") + _all("Bygningsforbedringsfond") \
            + _all("Støjpuljen") + _all("Nedrivnings- og omdannelsespuljen"):
        assert r["has_blocking_barrier"], r["title"]
        assert r["fit_label"] == "not_recommended", r["title"]
    faci = _one("Facilitetspuljen")
    assert faci["has_blocking_barrier"]
    assert any(x["rule_key"] == "facility_only" for x in faci["reasons"])


def test_blocker_never_outweighed_by_themes():
    for r in RESULTS.values():
        if r["has_blocking_barrier"]:
            assert r["fit_label"] == "not_recommended", r["title"]


def test_every_score_has_reasons():
    for r in RESULTS.values():
        assert r["score"] == max(0, min(100, sum(x["weight"] for x in r["reasons"]))), r["title"]
        if r["score"] > 0:
            assert any(x["kind"] == "strength" for x in r["reasons"]), r["title"]
        assert all(x["message"].strip() for x in r["reasons"]), r["title"]


def test_unknown_gate_caps_confidence():
    for r in RESULTS.values():
        if any(x["kind"] == "barrier" for x in r["reasons"]):
            assert r["confidence"] == "low", r["title"]
