import xml.etree.ElementTree as ET

import requests

from .config import PATH_PREFIXES, SITEMAP_URL
from scrapers.config import REQUEST_TIMEOUT, USER_AGENT

# Sitemaps are namespaced XML; without the prefix, iter() finds nothing.
LOC = "{http://www.sitemaps.org/schemas/sitemap/0.9}loc"


def discover():
    response = requests.get(
        SITEMAP_URL, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT
    )
    response.raise_for_status()

    root = ET.fromstring(response.content)
    urls = [loc.text for loc in root.iter(LOC) if loc.text]

    return [url for url in urls if any(prefix in url for prefix in PATH_PREFIXES)]


if __name__ == "__main__":
    matches = discover()
    print(f"Found {len(matches)} pages under {PATH_PREFIXES}\n")
    for url in matches:
        print(url)
