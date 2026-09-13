import re
from bs4 import BeautifulSoup

DANISH_DATE = re.compile(
    r"\d{1,2}\.?\s+(?:januar|februar|marts|april|maj|juni|juli|august"
    r"|september|oktober|november|december)\s+\d{4}",
    re.IGNORECASE,
)


def _text(el) -> str:
    return re.sub(r"\s+([.,;:!?)])", r"\1", el.get_text(" ", strip=True))


def _extract_deadline_tables(scope) -> list[dict]:
    deadlines = []
    for table in scope.find_all("table"):
        rows = [[_text(c) for c in tr.find_all(["td", "th"])] for tr in table.find_all("tr")]
        date_rows = [r for r in rows if r and DANISH_DATE.search(r[0])]
        if not date_rows:
            continue
        for r in date_rows:
            deadlines.append({
                "submit": r[0],
                "decided": r[1] if len(r) > 1 and r[1] else None,
            })
        table.extract()
    return deadlines


def parse(url: str, content: str) -> list[dict]:
    soup = BeautifulSoup(content, "html.parser")
    title = soup.find("h1")
    if title is None:
        return []
    title_text = _text(title)

    summary = soup.select_one(".hero__article__text > p")
    summary_text = _text(summary) if summary else None

    items = soup.select("#page-content .accordion__item")
    if not items:
        blocks = soup.select("#page-content .rich-text")
        deadlines = [d for b in blocks for d in _extract_deadline_tables(b)]
        return [{
            "title": title_text,
            "summary": summary_text,
            "description": "\n\n".join(_text(b) for b in blocks) or None,
            "deadline_table": deadlines,
            "source_url": url,
        }]

    records = []
    for item in items:
        heading = item.find(["h2", "h3"])
        body = item.select_one(".accordion-body")
        if heading is None or body is None:
            continue
        fragment = item.get("id")
        deadlines = _extract_deadline_tables(body)
        records.append({
            "title": _text(heading),
            "summary": summary_text,
            "description": _text(body) or None,
            "deadline_table": deadlines,
            "source_url": f"{url}#{fragment}" if fragment else url,
        })
    return records
