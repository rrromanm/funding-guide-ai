import re

ROOT = ("https://ufsn.dk/tilskud-puljer-og-bevillinger/"
        "internationalt-samarbejde-om-uddannelse-og-laering/erasmusplus")
YOUTH = f"{ROOT}/ungdomsorganisationer-og-foreninger"

BASE_URL = f"{ROOT}/soeg-tilskud/"

NAME = "Erasmus+ (ufsn.dk)"

DEFAULTS = {
    "funding_body": "Erasmus+",
    "level": "eu",
    "funder_type": "eu_programme",
    "recurring": True,
}

KA1_YOUTH = re.compile(r"ophold i udlandet for enkeltpersoner inden for ungdomsområdet", re.I)

ACTIONS = [
    ("KA152-YOU", "Youth exchanges (KA152)", KA1_YOUTH,
     f"{YOUTH}/ungdomsudvekslinger/"),
    ("KA153-YOU", "Mobility of youth workers (KA153)", KA1_YOUTH,
     f"{YOUTH}/kompetenceudvikling-i-udlandet-for-frivillige-og-ansatte/"),
    ("KA154-YOU", "Youth participation activities (KA154)", KA1_YOUTH,
     f"{YOUTH}/aktiviteter-med-ungedeltagelse/"),
    ("KA155-YOU", "DiscoverEU Inclusion (KA155)",
     re.compile(r"discovereu med inklusionsstøtte", re.I),
     f"{YOUTH}/discovereu-med-inklusionsstoette/"),
    ("KA210-YOU", "Small-scale partnerships, youth (KA210)",
     re.compile(r"small-scale partnerships.*ungdomsområdet", re.I),
     f"{YOUTH}/smaa-samarbejdsprojekter/"),
    ("KA220-YOU", "Cooperation partnerships, youth (KA220)",
     re.compile(r"cooperation partnerships.*undtagen", re.I),
     f"{YOUTH}/store-samarbejdsprojekter/"),
    ("KA150-YOU", "Erasmus accreditation, youth",
     re.compile(r"akkreditering inden for ungdomsområdet", re.I),
     f"{ROOT}/soeg-tilskud/erasmus-akkreditering/"),
]
