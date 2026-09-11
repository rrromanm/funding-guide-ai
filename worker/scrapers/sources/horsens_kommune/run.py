import json

import requests

from scrapers.config import REQUEST_TIMEOUT, USER_AGENT
from .discovery import discover
from .parser import parse

def run():
    records = []
    for url in discover():
        response = requests.get(
            url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        record = parse(url, response.text)
        if record:
            records.append(record)
    return records


if __name__ == "__main__":
    print(json.dumps(run(), ensure_ascii=False, indent=2))