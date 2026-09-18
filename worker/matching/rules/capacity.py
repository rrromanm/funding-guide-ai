from __future__ import annotations

from matching.engine import Reason

LOCAL_LEVELS = ("local", "municipal")
SMALL_ORG_MAX_STAFF = 0


def scale_fit(call, profile, config):
    if call.get("level") not in LOCAL_LEVELS:
        return []
    staff = profile.get("staff_count")
    if not (profile.get("established_recently")
            or (staff is not None and staff <= SMALL_ORG_MAX_STAFF)):
        return []
    return [Reason("strength", "scale_fit",
                   f"Local/municipal pool suits {profile['name']}'s size and volunteer-run "
                   "capacity — a lighter application than a national or EU call", 10)]
