from __future__ import annotations

import re

from matching.engine import Reason

THEME_WEIGHT = 15

def theme_overlap(call, profile, config):
    text = f"{call.get('title') or ''} {call.get('description') or ''}".lower()
    reasons = []
    for theme, keywords in config["themes"].items():
        if theme not in profile["themes"]:
            continue 
        hits = [kw for kw in keywords if re.search(r"\b" + re.escape(kw), text)]
        if hits:
            reasons.append(Reason(
                "strength", f"theme_{theme}",
                f"Theme '{theme}' matches PYN profile (terms: {', '.join(hits[:3])})",
                THEME_WEIGHT))
    return reasons
