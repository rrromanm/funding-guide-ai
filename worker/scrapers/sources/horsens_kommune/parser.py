from bs4 import BeautifulSoup


def parse(url: str, content: str) -> dict | None:
    soup = BeautifulSoup(content, "html.parser")
    title = soup.find("h1")
    if title is None:
        return None
    return {"title": title.get_text()}