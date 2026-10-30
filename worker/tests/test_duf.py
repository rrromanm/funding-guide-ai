import json

from scrapers.sources.duf.collect import collect

LOKAL = ("<p> </p><p>Puljen kan søges af lokalforeninger.</p><table><tbody>"
         "<tr><td><p><strong>Åbning af puljen (kl. 09.00)</strong></p></td>"
         "<td><p><strong>Ansøgningsfrist (kl.09.00)</strong></p></td><td><p>Bevillingsmøde</p></td></tr>"
         "<tr><td>6. februar 2026</td><td>7. april 2026</td><td>21. maj 2026</td></tr></tbody></table>")


def post(id, title, content):
    return {"id": id, "title": {"rendered": title}, "content": {"rendered": content},
            "link": f"https://duf.dk/tilskud-puljer/{id}/"}


def test_collect_reads_deadline_table_and_skips_help_page():
    body = json.dumps([post(1, "Hjælp til puljesøgning", "<p>Gode råd</p>"),
                       post(2, "Lokalforeningspuljen", LOKAL),
                       post(3, "Den internationale pulje", "<p>Næste ansøgningsfrist 1. november 2026</p>")])
    lokal, international = collect(lambda url: body)

    assert lokal["deadline_table"] == [
        {"opens": "6. februar 2026", "submit": "7. april 2026", "decided": "21. maj 2026"}]
    assert lokal["summary"] == "Puljen kan søges af lokalforeninger."
    assert lokal["description"].startswith("Puljen kan søges af lokalforeninger.\n")
    assert international["deadline_table"] == []  # free text: enrich() asks the LLM
    assert international["title"] == "Den internationale pulje"
