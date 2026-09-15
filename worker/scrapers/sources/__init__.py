"""Source registry.

A source is a package exposing exactly three names:

    discover() -> list[str]          URLs worth fetching
    parse(url, html) -> list[dict]   title / summary / description /
                                     deadline_table / source_url
    DEFAULTS: dict                   funding_body, level, funder_type,
                                     application_language

Adding a source: new folder, one import, one entry below. The pipeline, the
normaliser and the matching engine never change.
"""
from . import horsens_kommune

SOURCES = [horsens_kommune]
