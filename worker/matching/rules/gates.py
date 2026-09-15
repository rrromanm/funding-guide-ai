from __future__ import annotations

import re

from matching.engine import Reason

PRIVATE_OWNER = re.compile(
    r"din bolig|boligejendom|dit hus|din (?:bevaringsværdige )?bygning"
    r"|ejer du|som ejer|boligejer|husejer|grundejer", re.IGNORECASE)
ASSOCIATION = re.compile(r"forening|institution|selvorganiseret", re.IGNORECASE)
OWNER_ASSOCIATION = re.compile(
    r"grundejerforening|boligforening|ejerforening|andelsforening", re.IGNORECASE)
FACILITY = re.compile(
    r"facilitet|fysiske rammer|anlægssum|klubhus|klublokale|bygningsforbedring"
    r"|nedrivning|ejerskab til", re.IGNORECASE)
ACTIVITY = re.compile(r"arrangement|aktivitet|projekt|event|initiativ", re.IGNORECASE)
PURPOSE_EXCLUDED = re.compile(r"politisk|religiøs|kommerciel", re.IGNORECASE)


LEAD_CHARS = 300


def _text(call: dict) -> str:
    return f"{call.get('title') or ''} {call.get('description') or ''}"


def _lead(call: dict) -> str:
    return f"{call.get('title') or ''} {(call.get('description') or '')[:LEAD_CHARS]}"


def _is_association(text: str) -> bool:
    return bool(ASSOCIATION.search(OWNER_ASSOCIATION.sub(" ", text)))


def _danish(call: dict) -> bool:
    return call.get("application_language") in (None, "da")


def applicant_type(call, profile, config):
    if not _danish(call):
        return []
    text = _text(call)
    if PRIVATE_OWNER.search(_lead(call)) and not _is_association(_lead(call)):
        return [Reason("blocker", "applicant_type_mismatch",
                       "Pool targets private individuals/property owners, not associations",
                       -100)]
    if _is_association(text):
        return [Reason("info", "applicant_type_ok",
                       "Pool is open to associations/institutions")]
    return [Reason("barrier", "applicant_type_unknown",
                   "Eligible applicant type is not stated in the call text")]


def facility_only(call, profile, config):
    if not _danish(call):
        return []
    text = _text(call)
    if not FACILITY.search(text):
        return []
    # ponytail: facility words alongside activity words = mixed pool, let it through
    if ACTIVITY.search(text) and not FACILITY.search(call.get("title") or ""):
        return [Reason("info", "facility_mentioned",
                       "Call mentions facilities but also funds activities")]
    if not profile.get("has_venue"):
        return [Reason("blocker", "facility_only",
                       "Pool funds physical facilities/buildings only and PYN has no venue",
                       -100)]
    return []


def geographic(call, profile, config):
    if call.get("level") != "municipal":
        return []
    home = profile.get("municipality") or profile.get("city") or ""
    if home and re.search(re.escape(home.split()[0]), _text(call), re.IGNORECASE):
        return [Reason("info", "geographic_match",
                       f"Activity is in {home}, where {profile['name']} is based")]
    return [Reason("info", "geographic_assumed",
                   f"No geography stated; municipal source, {home or 'home municipality'} assumed")]


def purpose_excluded(call, profile, config):
    hits = sorted({m.group(0).lower() for m in PURPOSE_EXCLUDED.finditer(_text(call))})
    if hits:
        return [Reason("info", "purpose_restrictions",
                       f"Call mentions purpose restrictions ({', '.join(hits)}) — "
                       "check the excluded purposes before applying")]
    return []
