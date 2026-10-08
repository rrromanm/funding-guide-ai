import re
from bs4 import BeautifulSoup


def _text(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


def _funding_body(assessor: str) -> str:
    for name in ("Statens Kunstfond", "Kulturministeriet"):
        if name in assessor:
            return name
    return "Slots- og Kulturstyrelsen"


def parse(url: str, content: str) -> list[dict]:
    soup = BeautifulSoup(content, "html.parser")
    article = soup.select_one("article.tilskudsbase")
    title = article.find("h1") if article else None
    if title is None:
        return []

    sections = [_text(el) for el in article.select(".tilskudsbase__remarks, .tilskudsbase__linebox")]
    assessor = ""
    for box in article.select(".accordion__container"):
        heading = _text(box.select_one(".accordion__title"))
        body = _text(box.select_one(".accordion__content"))
        sections.append(f"{heading}\n{body}")
        if heading.startswith("Hvem vurderer"):
            assessor = body

    deadlines = [{"submit": _text(li), "decided": None}
                 for li in article.select(".tilskudsbase__linebox__right li")]

    return [{
        "title": _text(title),
        "summary": _text(article.select_one(".page__resume")) or None,
        "description": "\n\n".join(s for s in sections if s) or None,
        "deadline_table": deadlines,
        "source_url": url,
        "funding_body": _funding_body(assessor),
    }]
