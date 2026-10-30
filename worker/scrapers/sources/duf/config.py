import re

BASE_URL = "https://duf.dk/tilskud-puljer/"
API_URL = "https://duf.dk/wp-json/wp/v2/tilskud-puljer?per_page=100"

DEFAULTS = {
    "funding_body": "Dansk Ungdoms Fællesråd (DUF)",
    "level": "national",
    "funder_type": "public_pool",
    "application_language": "da",
}

NOT_A_GRANT = re.compile(r"hjælp til puljesøgning", re.IGNORECASE)
