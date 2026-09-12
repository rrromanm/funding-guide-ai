from bs4 import BeautifulSoup


def parse(url: str, content: str) -> dict | None:
    soup = BeautifulSoup(content, "html.parser")
    title = soup.find("h1")
    if title is None:
        return None
    title_text = title.get_text(strip=True)
    summary = soup.select_one(".hero__article__text")
    if summary and summary.find("h1"):
        summary.find("h1").decompose()
    description_blocks = soup.select("#page-content .rich-text")
    return {"title": title_text,
            "summary": summary.get_text(strip=True) if summary else None,
            "description": "\n\n".join(b.get_text(" ", strip=True) for b in description_blocks) or None
            }