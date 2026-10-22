# for each source: discover() -> fetch() -> parse(); then dedupe() -> enrich() (LLM) -> normalise() -> store()
from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from functools import cache
from urllib.parse import urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import requests

from scrapers.config import FETCH_DELAY, REQUEST_TIMEOUT, USER_AGENT
from scrapers.pipeline.extract import enrich
from scrapers.pipeline.normalise import normalise
from scrapers.pipeline.store import store
from scrapers.sources import SOURCES


@cache
def _robots(site: str) -> RobotFileParser:
    rules = RobotFileParser()
    try:
        response = requests.get(f"{site}/robots.txt", headers={"User-Agent": USER_AGENT},
                                timeout=REQUEST_TIMEOUT)
        rules.parse(response.text.splitlines() if response.ok else [])
    except requests.RequestException:
        rules.parse([])
    return rules


def fetch(url: str) -> str | None:
    parts = urlsplit(url)
    if not _robots(f"{parts.scheme}://{parts.netloc}").can_fetch(USER_AGENT, url):
        print(f"robots.txt disallows: {url}")
        return None
    time.sleep(FETCH_DELAY)
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

    if hasattr(source, "collect"):
        records = source.collect(fetch)
    else:
        records = []
        for url in source.discover():
            html = fetch(url)
            if html is None:
                continue
            try:
                records.extend(r for r in source.parse(url, html)
                               if not source.NOT_A_GRANT.search(r["title"]))
            except Exception as exc:
                print(f"    ! parse failed: {url} ({exc.__class__.__name__}: {exc})")

    stamp = datetime.now(timezone.utc).isoformat()
    for record in records:
        record.update({**source.DEFAULTS, **record}, source=name, last_checked=stamp,
                      source_url=_canonical(record["source_url"]))
    return records


def _canonical(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit(parts._replace(path=parts.path.rstrip("/") or "/"))


def _title_key(title: str) -> str:
    key = re.sub(r"\W+", "", title.lower())
    return key[:-1] if key.endswith("n") else key


def dedupe(records: list[dict]) -> list[dict]:
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
                       "name": getattr(source, "NAME", source.DEFAULTS.get("funding_body", name)),
                       "source_type": source.DEFAULTS.get("level"),
                       "base_url": getattr(source, "BASE_URL", None),
                       "last_checked": stamp if got else None})

    return normalise(enrich(dedupe(records))), health


if __name__ == "__main__":
    results, health = run()

    kinds = {}
    for r in results:
        kinds[r["record_kind"]] = kinds.get(r["record_kind"], 0) + 1
    print("\n" + ", ".join(f"{v} {k}" for k, v in sorted(kinds.items())))

    calls, rounds = store(results, health)
    print(f"stored {calls} calls, {rounds} rounds")
