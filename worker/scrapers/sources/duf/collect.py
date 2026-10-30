import html
import json
import re

from bs4 import BeautifulSoup

from .config import API_URL, NOT_A_GRANT

COLUMNS = (("Åbning", "opens"), ("Ansøgningsfrist", "submit"), ("Bevilling", "decided"))
BLOCKS = ["p", "li", "h1", "h2", "h3", "h4", "tr"]


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def deadline_table(soup) -> list[dict]:
    """The "Ansøgningsfrist | Bevillingsmøde" table; [] sends the dates to the LLM instead."""
    for table in soup.find_all("table"):
        rows = [[_clean(td.get_text(" ")) for td in tr.find_all(["td", "th"])]
                for tr in table.find_all("tr")]
        keys = [next((k for prefix, k in COLUMNS if cell.startswith(prefix)), None)
                for cell in (rows[0] if rows else [])]
        if "submit" in keys:
            return [{k: cell for k, cell in zip(keys, row) if k} for row in rows[1:]]
    return []


def summary(soup) -> str | None:
    """The pool's lead paragraph. Elementor leaves empty <p>s before it on some pools."""
    return next((t for t in (_clean(p.get_text(" ")) for p in soup.find_all("p")) if t), None)


def describe(soup) -> str:
    """Page text, one line per block. Mutates soup, so call it last."""
    for tag in soup(["script", "style"]):
        tag.decompose()
    for block in soup.find_all(BLOCKS):
        block.append("\n")
    return "\n".join(line for line in map(_clean, soup.get_text(" ").splitlines()) if line)


def collect(fetch) -> list[dict]:
    body = fetch(API_URL)
    if body is None:
        raise RuntimeError(f"could not fetch {API_URL}")
    records = []
    for post in json.loads(body):
        title = html.unescape(post["title"]["rendered"])
        if NOT_A_GRANT.search(title):
            continue
        soup = BeautifulSoup(post["content"]["rendered"], "html.parser")
        records.append({
            "title": title,
            "external_id": str(post["id"]),
            "summary": summary(soup),
            "deadline_table": deadline_table(soup),
            "description": describe(soup),
            "source_url": post["link"],
        })
    return records


if __name__ == "__main__":
    from scrapers.pipeline.run import fetch

    for record in collect(fetch):
        print(record["external_id"], record["title"], len(record["description"]), "chars")
        for row in record["deadline_table"]:
            print("   ", row)
