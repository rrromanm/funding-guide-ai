from __future__ import annotations

import hashlib
import re
from datetime import date

# 1. VOCABULARY
MONTHS = {m: i + 1 for i, m in enumerate(
    ["januar", "februar", "marts", "april", "maj", "juni", "juli",
     "august", "september", "oktober", "november", "december"])}
MONTHS.update({m: i + 1 for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july",
     "august", "september", "october", "november", "december"])})

_MONTH = "|".join(sorted(MONTHS, key=len, reverse=True))

DATE_PATTERNS = (
    # Danish and British style: "1. april 2026", "1 April 2026"
    (re.compile(rf"(\d{{1,2}})\.?\s+({_MONTH})\.?,?\s+(\d{{4}})", re.I), (1, 2, 3)),
    # American style: "April 1, 2026"        -> day is group 2, month is group 1
    (re.compile(rf"({_MONTH})\.?\s+(\d{{1,2}}),?\s+(\d{{4}})", re.I), (2, 1, 3)),
    # ISO, as EU portals emit: "2026-04-01"
    (re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"), (3, 2, 1)),
)

# DKK amounts. "150.000 kr" and "kr. 150.000".
KR_RE = re.compile(r"(?:kr\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*kr\b|kr\.?\s*(\d{1,3}(?:\.\d{3})+|\d+)", re.IGNORECASE)

# Test that separates a real call from a general information page.
APPLY_RE = re.compile(
    r"\bansøg|\bsøg|\btilskud|\bstøtte"
    r"|\bapply\b|\bapplication|\bgrant|\bfunding|\bcall for proposals", re.IGNORECASE)

# Distinguishes a rolling pool from one with rounds.
ROLLING_RE = re.compile(r"løbende|hele året|\brolling\b|year-round|\bongoing\b", re.IGNORECASE)

# A page that invites applications but carries almost no text is a stub
STUB_MAX_CHARS = 500


# 2. COMPLETENESS CHECK
# The 20 fields funding_calls models.
# Counting the failures gives missing_fields, and
# the ratio gives completeness
FIELD_CHECKS = {
    "title": lambda r: bool(r.get("title")),
    "funding_body": lambda r: bool(r.get("funding_body")),
    "summary": lambda r: bool(r.get("summary")),
    "description": lambda r: bool(r.get("description")),
    "level": lambda r: bool(r.get("level")),
    "funder_type": lambda r: bool(r.get("funder_type")),
    "application_language": lambda r: bool(r.get("application_language")),
    # A rolling pool has no date but is not missing its deadline — it has no deadline.
    "deadline": lambda r: bool(r["deadlines"]) or r["deadline_type"] == "rolling",
    "cycle": lambda r: r["deadline_type"] != "unknown",
    "funding_amount": lambda r: bool(r["amounts_kr"]),
    "thematic_areas": lambda r: bool(r.get("thematic_areas")),
    "keywords": lambda r: bool(r.get("keywords")),
    "opening_date": lambda r: bool(r.get("opening_date")),
    # "unknown" is a truthy string, so bool() would wrongly count it as present.
    "status": lambda r: r.get("status") not in (None, "", "unknown"),
    "project_duration": lambda r: bool(r.get("project_duration")),
    "eligibility_conditions": lambda r: bool(r.get("eligibility_conditions")),
    "target_applicant_types": lambda r: bool(r.get("target_applicant_types")),
    # Tri-state: False ("NGOs are not eligible") is a real answer, absence is not.
    "ngo_eligible": lambda r: r.get("ngo_eligible") is not None,
    "required_partners": lambda r: r.get("required_partners") is not None,
    "submission_route": lambda r: bool(r.get("submission_route")),
}

# 3. HELPERS
def _iso(m: re.Match, groups: tuple[int, int, int]) -> str:
    """One regex match -> "YYYY-MM-DD", given where day/month/year sit in it."""
    day, month, year = (m.group(g) for g in groups)
    # A named month resolves through MONTHS; ISO's numeric month falls through to int().
    num = MONTHS.get(month.lower()) or int(month)
    return f"{int(year):04d}-{num:02d}-{int(day):02d}"


def _parse_dates(text: str) -> list[dict]:
    """All supported formats, document order, one entry per distinct date.

    Each date is kept with the text it came from ("raw"), so a human reviewing a
    record can see what the parser read rather than only what it concluded.

    setdefault keeps the FIRST sighting of a date, so if two patterns both match
    the same day the earlier position wins; the final sort restores reading order
    across patterns, which matters because deadlines[0] is treated as "the next one".
    """
    found = {}
    for pattern, groups in DATE_PATTERNS:
        for m in pattern.finditer(text or ""):
            iso = _iso(m, groups)
            found.setdefault(iso, (m.start(), {"raw": m.group(0), "date": iso}))
    return [entry for _, entry in sorted(found.values(), key=lambda t: t[0])]


def _amounts(text: str) -> list[int]:
    """Every distinct DKK figure, in order. "150.000 kr" -> 150000.

    Either alternative of KR_RE fires, never both, so group(1) or group(2) holds
    the digits. Stripping "." removes the Danish thousands separator.
    """
    seen, out = set(), []
    for m in KR_RE.finditer(text or ""):
        value = int((m.group(1) or m.group(2)).replace(".", ""))
        if value not in seen:
            seen.add(value)
            out.append(value)
    return out


# 4. THE NORMALISER
def normalise(records: list[dict], today: date | None = None) -> list[dict]:
    cutoff = (today or date.today()).isoformat()
    out = []
    for raw in records:
        rec = dict(raw)
        desc = rec.get("description") or ""

        # What kind of page is this?
        if not APPLY_RE.search(desc):
            rec["record_kind"] = "info_page"
        elif len(desc) < STUB_MAX_CHARS:
            rec["record_kind"] = "stub"
        else:
            rec["record_kind"] = "call"

        # Deadlines
        table = rec.get("deadline_table") or []
        if table:
            rounds = [d for row in table for d in _parse_dates(row.get("submit", ""))]
        else:
            rounds = [d for d in _parse_dates(desc) if d["date"] >= cutoff]

        rec["deadlines"] = [d for d in rounds if d["date"] >= cutoff]
        rec["past_deadlines"] = [d for d in rounds if d["date"] < cutoff]

        # Application cycle
        rolling = bool(ROLLING_RE.search(desc))
        if rolling and not rec["deadlines"]:
            rec["deadline_type"] = "rolling" 
        elif len(rounds) > 1:
            rec["deadline_type"] = "multi_round"
        elif len(rounds) == 1 and not rolling:
            rec["deadline_type"] = "fixed"           
        else:
            rec["deadline_type"] = "unknown"

        # Status (Open/Closed)
        rec["status"] = ("open" if rec["deadlines"] or rec["deadline_type"] == "rolling"
                         else "closed" if rec["past_deadlines"] else "unknown")

        rec["amounts_kr"] = _amounts(desc)

        # Hash of title + description, to avoid duplicates across sources.
        content = re.sub(r"\s+", " ", f"{rec.get('title') or ''}\n{desc}").strip()
        rec["content_hash"] = hashlib.sha256(content.encode()).hexdigest()

        missing = [f for f, check in FIELD_CHECKS.items() if not check(rec)]
        rec["missing_fields"] = missing
        rec["completeness"] = round(1 - len(missing) / len(FIELD_CHECKS), 2)
        out.append(rec)
    return out
