from __future__ import annotations

import re
from pathlib import Path

DB_TYPES = (Path(__file__).resolve().parent.parent.parent
            / "api/src/lib/db-types.ts").read_text()


def columns(table: str) -> set[str]:
    """{"id", "title", ...} for a snake_case table name."""
    interface = "".join(p.title() for p in table.split("_"))
    body = re.search(rf"export interface {interface} \{{(.*?)\n\}}", DB_TYPES, re.S)
    assert body, f"{interface} not found in db-types.ts -- run npm run db:types"
    return set(re.findall(r"^  (\w+):", body.group(1), re.M))
