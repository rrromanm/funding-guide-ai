# for each source: discover() -> fetch() -> parse() -> normalise() -> dedupe() -> store()
from __future__ import annotations

import re
import time
from datetime import datetime, timezone

import requests

from scrapers.config import REQUEST_TIMEOUT, USER_AGENT
from scrapers.pipeline.normalise import normalise
from scrapers.pipeline.store import store
from scrapers.sources import SOURCES

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
        time.sleep(1)
        if html is None:
            continue
        try:
            records.extend(r for r in source.parse(url, html)
                           if not source.NOT_A_GRANT.search(r["title"]))
        except Exception as exc:
            print(f"    ! parse failed: {url} ({exc.__class__.__name__}: {exc})")

    stamp = datetime.now(timezone.utc).isoformat()
    for record in records:
        record.update({**source.DEFAULTS, **record}, source=name, last_checked=stamp)
    return records


def _title_key(title: str) -> str:
    key = re.sub(r"\W+", "", title.lower())
    # ponytail: drops any trailing "n" to fold the Danish definite article ("puljen" -> "pulje");
    # swap for a real stemmer if unrelated titles start colliding.
    return key[:-1] if key.endswith("n") else key


def dedupe(records: list[dict]) -> list[dict]:
    # One record per (source, title); the fullest description wins, every URL is kept.
    merged: dict[tuple[str, str], dict] = {}
    for record in records:
        sighting = {k: record[k] for k in ("source", "source_url", "last_checked")}
        key = (record["source"], _title_key(record["title"]))
        kept = merged.get(key)
        if kept is None:
            record["call_sources"] = [sighting]
            merged[key] = record
        elif sighting in kept["call_sources"]:
            continue
        elif len(record.get("description") or "") > len(kept.get("description") or ""):
            record["call_sources"] = kept["call_sources"] + [sighting]
            merged[key] = record
        else:
            kept["call_sources"].append(sighting)
    return list(merged.values())


def run() -> tuple[list[dict], list[dict]]:
    records, health = [], []
    for source in SOURCES:
        name = source.__name__.rsplit(".", 1)[-1]
        print(f"- {name}")
        stamp = datetime.now(timezone.utc).isoformat()
        try:
            got = collect(source)
        except Exception as exc:
            print(f"    ! {name} aborted ({exc.__class__.__name__}: {exc})")
            got = []
        else:
            print(f"    {len(got)} raw records")
        records.extend(got)
        health.append({"key": name,
                       "name": source.DEFAULTS.get("funding_body", name),
                       "source_type": source.DEFAULTS.get("level"),
                       "last_checked": stamp if got else None})

    return dedupe(normalise(records)), health


if __name__ == "__main__":
    results, health = run()

    kinds = {}
    for r in results:
        kinds[r["record_kind"]] = kinds.get(r["record_kind"], 0) + 1
    print("\n" + ", ".join(f"{v} {k}" for k, v in sorted(kinds.items())))

    calls, rounds = store(results, health)
    print(f"stored {calls} calls, {rounds} rounds")
