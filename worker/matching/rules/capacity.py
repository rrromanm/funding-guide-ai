from __future__ import annotations

from matching.engine import Reason

LOCAL_LEVELS = ("local", "municipal")


def scale_fit(call, profile, config):
    if call.get("level") not in LOCAL_LEVELS:
        return []
    if not (profile.get("established_recently") or profile.get("admin_capacity") == "limited"):
        return []
    return [Reason("strength", "scale_fit",
                   f"Local/municipal pool suits {profile['name']}'s size and limited admin "
                   "capacity — a lighter application than a national or EU call", 10)]
