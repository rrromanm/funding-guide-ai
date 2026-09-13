import json
from datetime import datetime, timezone

import requests

from scrapers.config import REQUEST_TIMEOUT, USER_AGENT
from .discovery import discover
from .parser import parse

SOURCE_DEFAULTS = {
    "funding_body": "Horsens Kommune",
    "level": "municipal",
    "funder_type": "public_pool",
    "application_language": "da",
}

# python -m scrapers.sources.horsens_kommune.run

def run():
    records = []
    for url in discover():
        response = requests.get(
            url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT
        )
        if not response.ok:
            continue
        for record in parse(url, response.text):
            record.update(
                SOURCE_DEFAULTS,
                last_checked=datetime.now(timezone.utc).isoformat(),
            )
            records.append(record)
    return records


if __name__ == "__main__":
    print(json.dumps(run(), ensure_ascii=False, indent=2))