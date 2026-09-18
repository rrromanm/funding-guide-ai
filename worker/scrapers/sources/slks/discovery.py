import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from .config import BASE_URL, LIST_PARAMS, LIST_URL, PAGE_PARAM
from scrapers.config import FETCH_DELAY, REQUEST_TIMEOUT, USER_AGENT

# python -m scrapers.sources.slks.discovery

def discover():
    urls = []
    for page in range(1, 50):
        response = requests.get(
            LIST_URL, params={**LIST_PARAMS, PAGE_PARAM: page},
            headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        found = [urljoin(BASE_URL, a["href"])
                 for a in soup.select('td.tdleft h2 a[href*="/stamside/tilskud/"]')]
        if not found:
            break
        urls.extend(u for u in found if u not in urls)
        time.sleep(FETCH_DELAY)
    return urls


if __name__ == "__main__":
    matches = discover()
    print(f"Found {len(matches)} open calls on {LIST_URL}\n")
    for url in matches:
        print(url)
