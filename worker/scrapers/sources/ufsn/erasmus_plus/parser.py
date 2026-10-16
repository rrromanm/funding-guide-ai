import re
from bs4 import BeautifulSoup

from scrapers.pipeline.normalise import _parse_dates
from .config import ACTIONS

DEADLINE = "Ansøgningsfrist"


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _text(el) -> str:
    return _clean(el.get_text(" ", strip=True)) if el else ""


def _rows(soup) -> list[tuple[str, list[str]]]:
    rows = []
    for ul in soup.select(".content-rte ul"):
        prefix = ""
        for li in ul.find_all("li"):
            lines = [_clean(s) for s in li.stripped_strings]
            dates = [line for line in lines if line.startswith(DEADLINE)]
            label = " ".join(line for line in lines if not line.startswith(DEADLINE))
            if dates:
                rows.append((prefix + label, dates))
                prefix = ""
            elif label.endswith(":"):
                prefix = label + " "
    return rows


def deadlines(html: str) -> dict[str, list[str]]:
    rows = _rows(BeautifulSoup(html, "html.parser"))
    found = {}
    for code, _, pattern, _ in ACTIONS:
        lines = [line for label, dates in rows if pattern.search(label) for line in dates]
        if not lines:
            raise ValueError(f"{code}: no deadline row matches {pattern.pattern!r}")
        if not all(_parse_dates(line) for line in lines):
            raise ValueError(f"{code}: deadline without a date: {lines}")
        found[code] = lines
    return found


def describe(html: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    for notice in soup.select(".cookieconsent-optout-marketing"):  # "Tillad venligst alle cookies ..."
        notice.decompose()
    article = soup.select_one(".area-content__text")
    blocks = [t for t in map(_text, article.find_all(recursive=False)) if t] if article else []
    if not blocks:
        raise ValueError("detail page has no text in .area-content__text")
    return blocks[0], "\n\n".join([_text(soup.find("h1"))] + blocks)
