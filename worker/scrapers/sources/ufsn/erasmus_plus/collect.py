from .config import ACTIONS, BASE_URL
from .parser import deadlines, describe

def _get(fetch, url: str) -> str:
    html = fetch(url)
    if html is None:
        raise RuntimeError(f"could not fetch {url}")
    return html


def collect(fetch) -> list[dict]:
    dates = deadlines(_get(fetch, BASE_URL))
    records = []
    for code, title, _, url in ACTIONS:
        summary, description = describe(_get(fetch, url))
        records.append({
            "title": title,
            "external_id": code,
            "summary": summary,
            "description": description,
            "deadline_table": [{"submit": line, "decided": None} for line in dates[code]],
            "source_url": url,
        })
    return records


if __name__ == "__main__":
    from scrapers.pipeline.run import fetch

    for record in collect(fetch):
        print(record["external_id"], record["title"], len(record["description"]), "chars")
        for row in record["deadline_table"]:
            print("   ", row["submit"])
