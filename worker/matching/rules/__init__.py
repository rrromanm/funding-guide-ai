from . import capacity, gates, themes

RULES = [
    gates.applicant_type,
    gates.facility_only,
    gates.geographic,
    gates.purpose_excluded,
    capacity.scale_fit,
    themes.theme_overlap,
]
