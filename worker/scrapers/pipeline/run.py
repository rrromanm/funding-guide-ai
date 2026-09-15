# for each source: discover() -> fetch() -> parse() -> normalise() -> dedupe() -> matching
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import requests

from scrapers.config import REQUEST_TIMEOUT, USER_AGENT
from scrapers.pipeline.normalise import normalise
from scrapers.sources import SOURCES

WORKER = Path(__file__).resolve().parent.parent.parent

def fetch(url: str) -> str | None:
    try:
        response = requests.get(
            url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT
        )
    except requests.RequestException as exc:
        print(f"fetch failed: {url} ({exc.__class__.__name__})")
        return None
    if not response.ok:
        print(f"HTTP {response.status_code}: {url}")
        return None
    return response.text


def collect(source) -> list[dict]:
    name = source.__name__.rsplit(".", 1)[-1]

    records = []
    for url in source.discover():
        html = fetch(url)
        if html is None:
            continue 
        try:
            records.extend(source.parse(url, html))
        except Exception as exc:
            print(f"    ! parse failed: {url} ({exc.__class__.__name__}: {exc})")

    stamp = datetime.now(timezone.utc).isoformat()
    for record in records:
        # DEFAULTS carries what the source knows about itself and the parser cannot
        record.update(source.DEFAULTS, source=name, last_checked=stamp)
    return records


def dedupe(records: list[dict]) -> list[dict]:
    # One record per content_hash, keeping every URL it was sighted at.
    # Merging on content_hash (title + description, URL deliberately excluded) rather
    # than on URL is what makes both cases collapse to a single record. 
    merged: dict[str, dict] = {}
    for record in records:
        sighting = {k: record[k] for k in ("source", "source_url", "last_checked")}
        kept = merged.get(record["content_hash"])
        if kept is None:
            record["call_sources"] = [sighting]
            merged[record["content_hash"]] = record
        elif sighting not in kept["call_sources"]:
            kept["call_sources"].append(sighting)
    return list(merged.values())


def run() -> list[dict]:
    records = []
    for source in SOURCES:
        name = source.__name__.rsplit(".", 1)[-1]
        print(f"- {name}")
        try:
            got = collect(source)
        except Exception as exc:
            print(f"    ! {name} aborted ({exc.__class__.__name__}: {exc})")
            continue
        print(f"    {len(got)} raw records")
        records.extend(got)

    # Normalise before dedupe, because dedupe needs the content_hash
    return dedupe(normalise(records))


if __name__ == "__main__":
    results = run()
    out = WORKER / "data/normalised.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2))

    kinds = {}
    for r in results:
        kinds[r["record_kind"]] = kinds.get(r["record_kind"], 0) + 1
    print(f"\n{len(results)} records -> {out}")
    print("  " + ", ".join(f"{v} {k}" for k, v in sorted(kinds.items())))
