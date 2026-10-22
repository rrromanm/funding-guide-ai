from __future__ import annotations

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
    # Numeric Danish, as SLKS emits: "24.09.2026" (month capped at 12 so amounts never match)
    (re.compile(r"\b(\d{1,2})\.(0?[1-9]|1[0-2])\.(\d{4})\b"), (1, 2, 3)),
    # ISO, as EU portals emit: "2026-04-01"
    (re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"), (3, 2, 1)),
)

# Test that separates a real call from a general information page.
APPLY_RE = re.compile(
    r"\bansøg|\bsøg|\btilskud|\bstøtte"
    r"|\bapply\b|\bapplication|\bgrant|\bfunding|\bcall for proposals", re.IGNORECASE)

# A deadline-table cell that marks a rolling pool ("Løbende").
ROLLING_RE = re.compile(r"løbende|hele året|\brolling\b|year-round|\bongoing\b", re.IGNORECASE)

# A page that invites applications but carries almost no text is a stub
STUB_MAX_CHARS = 500


# 2. HELPERS
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


def record_kind(description: str | None) -> str:
    """What kind of page this is. Not stored -- store() drops info pages."""
    desc = description or ""
    if not APPLY_RE.search(desc):
        return "info_page"
    return "stub" if len(desc) < STUB_MAX_CHARS else "call"


# 3. THE NORMALISER
def normalise(records: list[dict], today: date | None = None) -> list[dict]:
    cutoff = (today or date.today()).isoformat()
    out = []
    for raw in records:
        rec = dict(raw)
        rec["record_kind"] = record_kind(rec.get("description"))

        # Rounds come only from a deadline table: the scraper's, or the one enrich() builds from free text.
        table = rec.get("deadline_table") or []
        rounds = [d for row in table for d in _parse_dates(row.get("submit") or "")]
        rec["deadlines"] = [d for d in rounds if d["date"] >= cutoff]
        rec["past_deadlines"] = [d for d in rounds if d["date"] < cutoff]

        # Application cycle.
        rolling = bool(rec.get("rolling")) or bool(
            ROLLING_RE.search(" ".join(row.get("submit") or "" for row in table)))
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

        out.append(rec)
    return out
