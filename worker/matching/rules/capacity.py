from __future__ import annotations

from matching.engine import Reason

LOCAL_LEVELS = ("local", "municipal")


def scale_fit(call, profile, config):
    if call.get("level") not in LOCAL_LEVELS or profile.get("staff_count") != 0:
        return []
    return [Reason("strength", "scale_fit",
                   f"Local/municipal pool suits {profile['name']}'s size and volunteer-run "
                   "capacity — a lighter application than a national or EU call", 10)]
