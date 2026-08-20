"""Shared structured-output contract for complaint analysis -- both
Gemini and Groq providers produce raw JSON that is validated against
`ComplaintAnalysisSchema` and then normalized by `sanitize_analysis()`
before it's allowed anywhere near the complaint/ticket/SLA pipeline. This
is the "the output must be validated before entering the existing
complaint pipeline" step for the Groq path in particular, since Groq's
JSON-mode output is not schema-constrained the way some other providers'
structured-output modes are.

The five fields here (plus keywords) are the ENTIRE existing API
contract every caller of analysis_service.analyze_complaint() already
depends on (see app/routes/analysis.py, app/routes/complaints.py, and
BackendComplaint / AnalyzeResult in the frontend's types/index.ts) --
nothing added, nothing removed.
"""

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

ALLOWED_DEPARTMENTS = {
    "Water",
    "Electricity",
    "Roads",
    "Sanitation",
    "Healthcare",
    "Police",
    "Transport",
    "Municipal",
    "Disaster Management",
    "Other",
}

ALLOWED_PRIORITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}


class ComplaintAnalysisSchema(BaseModel):
    """Permissive on purpose -- a real-world LLM completion can omit a
    field, use unexpected casing, or send an empty string. Rejecting
    those outright would mean an otherwise-usable analysis gets thrown
    away entirely; sanitize_analysis() below is where those get corrected
    to a safe default instead. What this schema DOES strictly enforce is
    *shape*: e.g. `keywords` must actually be a list of strings, not some
    other JSON type entirely -- that's the class of malformed-output bug
    worth failing fast on before it reaches the DB.
    """

    category: str = "Other"
    department: str = "Other"
    priority: str = "MEDIUM"
    summary: str = ""
    location: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)

    @field_validator("category", "department", "priority", "summary", mode="before")
    @classmethod
    def _coerce_str(cls, v):
        return "" if v is None else str(v)

    @field_validator("keywords", mode="before")
    @classmethod
    def _coerce_keywords(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError("keywords must be a list")
        return v


def sanitize_analysis(data: dict) -> dict:
    """Normalizes a validated ComplaintAnalysisSchema-shaped dict into the
    exact final values the complaint pipeline expects: department/priority
    snapped to their allowed enums (defaulting rather than rejecting on a
    near-miss, e.g. wrong casing), null-like location strings collapsed to
    a real `None`, empty keywords entries dropped."""
    category = str(data.get("category", "Other")).strip() or "Other"

    raw_dept = str(data.get("department", "Other")).strip()
    department = next(
        (d for d in ALLOWED_DEPARTMENTS if d.lower() == raw_dept.lower()),
        "Other",
    )

    raw_priority = str(data.get("priority", "MEDIUM")).strip().upper()
    priority = raw_priority if raw_priority in ALLOWED_PRIORITIES else "MEDIUM"

    summary = str(data.get("summary", "")).strip() or "No summary available."

    raw_loc = data.get("location")
    if isinstance(raw_loc, str):
        clean_loc = raw_loc.strip()
        location = None if clean_loc.lower() in {"null", "none", "n/a", "unknown", ""} else clean_loc
    else:
        location = None

    raw_keywords = data.get("keywords", [])
    keywords = [str(k).strip() for k in raw_keywords if str(k).strip()] if isinstance(raw_keywords, list) else []

    return {
        "category": category,
        "department": department,
        "priority": priority,
        "summary": summary,
        "location": location,
        "keywords": keywords,
    }
