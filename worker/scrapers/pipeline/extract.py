# LLM normalisation: fills the fields the normalizer can't read (eligibility, NGO-eligible, budget,
# themes, target groups) and groups free-text dates into rounds.
from __future__ import annotations

import json
import os
import re
import time
import unicodedata

import requests

from scrapers.pipeline.normalise import _parse_dates, record_kind
from scrapers.pipeline.store import stored_calls, vocabulary

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"
RETRYABLE = {429, 500, 502, 503, 504}
_next_request = 0.0


class DailyQuotaError(RuntimeError):
    pass


def gemini_json(prompt: str, schema: dict, attempts: int = 5) -> dict:
    global _next_request
    model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
    for attempt in range(1, attempts + 1):
        time.sleep(max(0.0, _next_request - time.time()))
        _next_request = time.time() + 60 / float(os.environ.get("GEMINI_RPM", 15))
        response = requests.post(
            f"{GEMINI_URL}/{model}:generateContent",
            headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
            json={"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                  "generationConfig": {"temperature": 0, "responseMimeType": "application/json",
                                       "responseJsonSchema": schema}},
            timeout=120,
        )
        if response.ok:
            parts = response.json()["candidates"][0]["content"]["parts"]
            return json.loads("".join(p.get("text", "") for p in parts))
        message = f"Gemini {response.status_code}: {response.text[:300]}"
        if response.status_code == 429 and "PerDay" in response.text:
            raise DailyQuotaError(message)
        if response.status_code not in RETRYABLE or attempt == attempts:
            raise RuntimeError(message)
        time.sleep(2 * 2 ** (attempt - 1))


_DASHES = dict.fromkeys(map(ord, "‐‑‒–—―−"), "-")
_QUOTES = {**dict.fromkeys(map(ord, "‘’‚‛´`"), "'"), **dict.fromkeys(map(ord, "“”„‟«»"), '"')}


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower().translate(_DASHES).translate(_QUOTES)
    return re.sub(r"\s+", " ", text).strip()


def grounded(quote: str | None, text: str) -> bool:
    needle = _norm(quote or "").strip("\"'.… ")
    return bool(needle) and needle in _norm(text)


_AMOUNT = re.compile(r"(\d{1,3}(?:[.\s]\d{3})+|\d+(?:,\d+)?)\s*(mio|million)?", re.I)


def _amounts_in(quote: str) -> set[int]:
    """Every amount written in the quote: "150.000 kr." -> 150000, "49,2 mio." -> 49200000."""
    return {round(float(re.sub(r"[.\s]", "", num).replace(",", ".")) * (1_000_000 if mio else 1))
            for num, mio in _AMOUNT.findall(quote)}


def _currency(quote: str) -> str | None:
    if re.search(r"\b(kr|kroner|dkk)\b", quote, re.I):
        return "DKK"
    if re.search(r"\beur\b|euro|€", quote, re.I):
        return "EUR"
    return None


def date_candidates(text: str) -> list[dict]:
    """Every date _parse_dates finds, with an id ("d1") and the words around it."""
    out = []
    for n, d in enumerate(_parse_dates(text), 1):
        i = text.find(d["raw"])
        context = re.sub(r"\s+", " ", text[max(0, i - 90):i + len(d["raw"]) + 60])
        out.append({**d, "id": f"d{n}", "context": context})
    return out


def build_prompt(text: str, themes: list[str], groups: list[str]) -> str:
    return f"""You extract facts from one funding call (often in Danish) for a database. Work only from the call text below; use no outside knowledge. When the text does not state something, return null or an empty list rather than guessing.

Every evidence field is an exact quote from the call text, copied character for character in the original language: no translation, no paraphrase, no "...". Keep it short: one sentence or phrase.

<call>
{text}
</call>

## Fields
- eligibility: who may apply, in one or two plain English sentences (null if the text does not say); evidence: the quote that says so.
- ngo_eligible: may a nonprofit association (forening, NGO, frivillig organisation) apply? "yes", "no", or "unclear" when the text does not say; evidence: the quote, or null when unclear.
- rolling: "yes" when applications are accepted at any time, with no fixed deadline (e.g. "løbende ansøgning", "hele året"), else "no"; evidence: the quote, or null. "Løbende" about anything other than applying is "no".
- budget: the amount ONE application can receive, never the pool's total. min and max as plain numbers (150.000 kr. is 150000), null for a side the text does not state; evidence: the quote containing the amounts, or null when no per-application amount is stated.
- themes: the call's main purpose, from this list only: {", ".join(themes)}. Empty if none fits.
- target_groups: who the funded activities are meant to reach, from this list only: {", ".join(groups)}. Empty if none fits.

Return only JSON matching the response schema."""


def rounds_prompt(candidates: list[dict]) -> str:
    lines = "\n".join(f'{c["id"]}: {c["raw"]}: "...{c["context"]}..."' for c in candidates)
    return f"""Below are the dates found in one funding call (usually Danish), each with an id and the words around it.
Group them into application rounds. For each round give the ids (d1, d2, ...), never the dates themselves:
- deadline: the date that is the last day to apply ("ansøgningsfrist", "frist", "senest");
- decision: the date applications in that round are decided or answered ("behandling i udvalget", "svar", "afgørelse"), or "none";
- opens: the date applications start, or "none".
Include rounds whose dates have already passed. Leave out dates that belong to no round (events, project periods, rules in force, reporting).

{lines}

Return only JSON matching the response schema."""


def response_schema(themes: list[str], groups: list[str]) -> dict:
    text, quote, number = {"type": ["string", "null"]}, {"type": ["string", "null"]}, {"type": ["number", "null"]}

    def obj(**props):
        return {"type": "object", "properties": props, "required": list(props)}

    return obj(
        eligibility=obj(summary=text, evidence=quote),
        ngo_eligible=obj(answer={"type": "string", "enum": ["yes", "no", "unclear"]}, evidence=quote),
        rolling=obj(answer={"type": "string", "enum": ["yes", "no"]}, evidence=quote),
        budget=obj(min=number, max=number, evidence=quote),
        themes={"type": "array", "items": {"type": "string", "enum": themes}},
        target_groups={"type": "array", "items": {"type": "string", "enum": groups}},
    )


def rounds_schema(ids: list[str]) -> dict:
    # an enum of the candidate ids: the model can only point at a date the parser read
    ref, optional = {"type": "string", "enum": ids}, {"type": "string", "enum": ids + ["none"]}
    return {"type": "object", "required": ["rounds"],
            "properties": {"rounds": {"type": "array", "items": {
                "type": "object", "required": ["deadline", "decision", "opens"],
                "properties": {"deadline": ref, "decision": optional, "opens": optional}}}}}


def free_text_rounds(candidates: list[dict]) -> list[dict]:
    """The application rounds in free text, as ISO dates from the candidates."""
    if not candidates:
        return []
    by_id = {c["id"]: c["date"] for c in candidates}
    out = gemini_json(rounds_prompt(candidates), rounds_schema(list(by_id)))
    return [{"deadline_date": by_id[r["deadline"]], "decision_date": by_id.get(r["decision"]),
             "open_date": by_id.get(r["opens"])}
            for r in out["rounds"] if r["deadline"] in by_id]


def extract(rec: dict, themes: list[str], groups: list[str]) -> tuple[dict, dict]:
    """(checked fields, raw model output). A field whose quote isn't in the text is None."""
    text = "\n\n".join(filter(None, [rec["title"], rec.get("summary"), rec.get("description")]))
    out = gemini_json(build_prompt(text, themes, groups), response_schema(themes, groups))

    eligibility, ngo, budget = out["eligibility"], out["ngo_eligible"], out["budget"]
    amounts = _amounts_in(budget["evidence"]) if grounded(budget["evidence"], text) else set()
    low, high = (v if v is not None and round(v) in amounts else None for v in (budget["min"], budget["max"]))

    return {
        "eligibility": eligibility["summary"] if grounded(eligibility["evidence"], text) else None,
        "ngo_eligible": ({"yes": True, "no": False}.get(ngo["answer"])
                         if grounded(ngo["evidence"], text) else None),
        "budget_min": low,
        "budget_max": high,
        "currency": _currency(budget["evidence"]) if low or high else None,
        "themes": [t for t in out["themes"] if t in themes],
        "target_groups": [g for g in out["target_groups"] if g in groups],
        "rolling": out["rolling"]["answer"] == "yes" and grounded(out["rolling"]["evidence"], text),
    }, out


def enrich(records: list[dict]) -> list[dict]:
    """LLM fields for every call whose description changed since it was stored; the rest keep theirs.

    A call without a deadline table gets one built from its free-text rounds, so normalise()
    computes status from those dates the same way as from a scraped table.
    """
    themes, groups = vocabulary()
    known = stored_calls([r["source_url"] for r in records])
    if not os.environ.get("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY is not set (add it to worker/.env)")

    asked = 0
    for rec in records:
        if record_kind(rec.get("description")) == "info_page":
            continue
        free_text = not rec.get("deadline_table")
        old = known.get(rec["source_url"])
        if old and old["description"] == rec.get("description") and old["eligibility"]:
            rec.update(old["fields"])
            if free_text:
                rec["deadline_table"], rec["rolling"] = old["rounds"], old["rolling"]
            continue

        print(f"    llm: {rec['title'][:70]}")
        asked += 1
        try:
            fields, _ = extract(rec, themes, groups)
            rounds = free_text_rounds(date_candidates(rec.get("description") or "")) if free_text else []
        except DailyQuotaError:
            raise
        except Exception as exc:
            print(f"    ! extraction failed ({exc.__class__.__name__}: {exc})")
            continue

        rolling = fields.pop("rolling")
        rec.update(fields)
        if free_text:
            rec["rolling"] = rolling
            rec["deadline_table"] = [{"submit": r["deadline_date"], "decided": r["decision_date"],
                                      "opens": r["open_date"]} for r in rounds]
    print(f"    {asked} calls sent to the LLM, {len(records) - asked} reused or skipped")
    return records
