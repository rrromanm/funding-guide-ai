"""Discovery for the Horsens Kommune source.

Fetches the sitemap and prints the funding-page URLs found under
/fritid/soegstoette/.

Run:
    cd worker
    python -m ingestion.sources.horsens_kommune.discovery
"""

import xml.etree.ElementTree as ET

import requests

SITEMAP_URL = "https://horsens.dk/sitemap.xml"
PATH_PREFIX = "/fritid/soegstoette/"
USER_AGENT = "FundingGuideAI/0.1 (bachelor project; contact@pangaeayouth.org)"

# Sitemaps are namespaced XML. Without this, findall() silently returns nothing.
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def discover():
    """Return the list of funding-page URLs from the sitemap."""
    response = requests.get(SITEMAP_URL, headers={"User-Agent": USER_AGENT}, timeout=20)
    response.raise_for_status()

    root = ET.fromstring(response.text)
    urls = [el.text for el in root.findall("sm:url/sm:loc", NS) if el.text]

    return [url for url in urls if PATH_PREFIX in url]


if __name__ == "__main__":
    matches = discover()
    print(f"Found {len(matches)} pages under {PATH_PREFIX}\n")
    for url in matches:
        print(url)