BASE_URL = "https://slks.dk"
LIST_URL = f"{BASE_URL}/tilskud/soeg-puljer"
LIST_PARAMS = {"tx_lftilskudsbase_pi7[order]": "application_deadline asc"}
PAGE_PARAM = "tx_lftilskudsbase_general[@widget_0][currentPage]"

DEFAULTS = {
    "level": "national",
    "funder_type": "public_pool",
    "application_language": "da",
}
