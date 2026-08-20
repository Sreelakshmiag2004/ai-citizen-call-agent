"""Real, source-attributed documents for the chatbot's RAG knowledge base
(Stage 1 of MASTER_TODO.md's RAG chatbot item -- see the plan report for
the full multi-stage design). No synthetic government policy or invented
information: every document here is either generated directly from an
existing authoritative Python constant (SLA durations, department
routing), or a faithful transcription of existing real frontend/README
content -- never fabricated for this purpose. Each document carries a
`source` field identifying exactly where its content came from, so a
retrieved answer can always be traced back to something a human already
wrote or configured, not something an LLM invented on the fly.

Two categories, by provenance:

1. GENERATED directly from the same live constants the application itself
   uses for real decisions (`sla_service.SLA_DURATIONS_HOURS`,
   `department_routing.DEPARTMENT_MAPPING`/`CANONICAL_DEPARTMENTS`). These
   can never drift out of sync with actual app behavior -- re-running
   ingestion after either source changes regenerates matching content.

2. TRANSCRIBED from real, human-authored content that lives in a
   different part of the repo and can't be imported directly (frontend
   TypeScript, Markdown): `CIVIC_SERVICES` in
   `govportal-citizen-assistant/src/data/mockData.ts`, and prose from the
   root `README.md` / `AboutHelpPage.tsx`. These CAN drift if their
   source file changes without this file being updated to match -- a
   known Stage 1 limitation, not a defect; see the completion report's
   "remaining blockers" for the recommended long-term fix (a single
   shared source both frontend and backend read, rather than a manual
   copy).

SLA discrepancy (resolved here, not silently): `AboutHelpPage.tsx`
displays "SLA Resolution Target: 48 to 72 Hours Average", which does not
match any real value `sla_service.SLA_DURATIONS_HOURS` actually uses (2h
Critical / 8h High / 24h Medium / 72h Low -- there is no 48h tier, and
nothing in the codebase computes a cross-priority "average"). Per this
stage's instructions, `sla_service.py` is authoritative; that frontend
sentence is deliberately EXCLUDED from ingestion rather than transcribed
alongside the real figures, so the knowledge base has exactly one
SLA statement, generated from the same constant the backend enforces.
The frontend page itself is unchanged -- fixing its copy is a separate,
not-yet-authorized UI change outside this stage's scope.
"""

from typing import Any, Dict, List

from app.services import department_routing
from app.services import sla_service

# ---------------------------------------------------------------------------
# 1. SLA policy -- GENERATED from sla_service.py's real constants.
# ---------------------------------------------------------------------------


def _build_sla_document() -> Dict[str, Any]:
    durations = sla_service.SLA_DURATIONS_HOURS
    at_risk_pct = sla_service.SLA_AT_RISK_PERCENT

    priority_lines = "\n".join(
        f"- {priority.title()} priority: {hours} hour{'s' if hours != 1 else ''} to resolve."
        for priority, hours in durations.items()
    )

    text = (
        "GovPortal SLA (Service Level Agreement) policy for complaint resolution.\n"
        f"{priority_lines}\n"
        f"A complaint is marked AT_RISK once it has less than {at_risk_pct:.0f}% "
        "of its total SLA duration remaining before the deadline. "
        "A complaint that passes its SLA deadline without being resolved or "
        "closed is marked BREACHED and escalated (level 1 on first breach, "
        "level 2 if it remains unresolved for a further full SLA duration "
        "past the deadline). A complaint resolved or closed before its "
        "deadline is marked COMPLETED."
    )

    return {
        "id": "sla-policy",
        "title": "SLA Policy",
        "text": text,
        "source": "backend/app/services/sla_service.py (SLA_DURATIONS_HOURS, SLA_AT_RISK_PERCENT)",
        "topic": "sla",
    }


# ---------------------------------------------------------------------------
# 2. Department routing -- GENERATED from department_routing.py's real
#    constants, one document per canonical department.
# ---------------------------------------------------------------------------


def _build_department_documents() -> List[Dict[str, Any]]:
    keywords_by_department: Dict[str, List[str]] = {dept: [] for dept in department_routing.CANONICAL_DEPARTMENTS}

    for keyword, display_name in department_routing.DEPARTMENT_MAPPING.items():
        for canonical in department_routing.CANONICAL_DEPARTMENTS:
            if canonical.lower() in display_name.lower():
                keywords_by_department[canonical].append(keyword)
                break

    documents = []
    for canonical in department_routing.CANONICAL_DEPARTMENTS:
        keywords = sorted(set(keywords_by_department.get(canonical, [])))
        if canonical == "Other":
            text = (
                "The 'Other' / General Department handles complaints that do not "
                "clearly match any of GovPortal's specific departments (Water, "
                "Electricity, Roads, Sanitation, Healthcare, Police, Transport, "
                "Municipal, Disaster Management). A complaint is routed here when "
                "its category can't be confidently classified into a more specific "
                "department."
            )
        else:
            kw_text = ", ".join(keywords) if keywords else "no specific keyword synonyms configured"
            text = (
                f"The {canonical} Department handles complaints related to: {kw_text}. "
                f"A complaint mentioning any of these terms is routed to the {canonical} Department."
            )

        documents.append(
            {
                "id": f"dept-{canonical.lower().replace(' ', '-')}",
                "title": f"{canonical} Department",
                "text": text,
                "source": "backend/app/services/department_routing.py (DEPARTMENT_MAPPING, CANONICAL_DEPARTMENTS)",
                "topic": "department",
            }
        )

    return documents


# ---------------------------------------------------------------------------
# 3. Civic services -- TRANSCRIBED from
#    govportal-citizen-assistant/src/data/mockData.ts's CIVIC_SERVICES
#    (frontend TypeScript, not importable from the backend). Faithful copy
#    of that file's real content as of this stage; see module docstring
#    for the drift caveat.
# ---------------------------------------------------------------------------

_CIVIC_SERVICES_TRANSCRIBED: List[Dict[str, str]] = [
    {
        "id": "roads",
        "name": "Roads & Infrastructure",
        "description": "Potholes, broken footpaths, speed breakers, bridge maintenance and street signs.",
        "department": "Public Works Dept.",
    },
    {
        "id": "water",
        "name": "Water Supply & Drainage",
        "description": "Pipeline leaks, contaminated water supply, storm water drain blockages and sewer overflows.",
        "department": "Water Supply & Sewerage Board",
    },
    {
        "id": "electricity",
        "name": "Electricity & Power",
        "description": "Non-functional street lights, power transformer faults, hanging cables and power outages.",
        "department": "Electricity Supply Company",
    },
    {
        "id": "sanitation",
        "name": "Sanitation & Waste",
        "description": "Garbage collection delays, overflowing public dumpsters, street sweeping and debris removal.",
        "department": "Municipal Solid Waste Dept.",
    },
    {
        "id": "transport",
        "name": "Public Transport",
        "description": "Bus stop shelter damage, bus timetable irregularities, ticketing issues and feeder route queries.",
        "department": "Metropolitan Transport Corp.",
    },
]


def _build_civic_service_documents() -> List[Dict[str, Any]]:
    documents = []
    for svc in _CIVIC_SERVICES_TRANSCRIBED:
        text = (
            f"{svc['name']}: {svc['description']} "
            f"Primary authority: {svc['department']}."
        )
        documents.append(
            {
                "id": f"civic-{svc['id']}",
                "title": svc["name"],
                "text": text,
                "source": "govportal-citizen-assistant/src/data/mockData.ts (CIVIC_SERVICES)",
                "topic": "civic_service",
            }
        )
    return documents


# ---------------------------------------------------------------------------
# 4. About the platform / contact info -- TRANSCRIBED from README.md and
#    AboutHelpPage.tsx. The frontend's conflicting SLA sentence ("48 to 72
#    Hours Average") is deliberately excluded -- see module docstring.
# ---------------------------------------------------------------------------

_ABOUT_PLATFORM_DOC: Dict[str, Any] = {
    "id": "about-platform",
    "title": "About GovPortal",
    "text": (
        "GovPortal (Citizen Call Intelligence) is a multilingual AI-powered "
        "citizen complaint intelligence and routing platform. It accepts "
        "multilingual voice or text complaints -- including real phone calls "
        "through Twilio -- converts speech to text, extracts complaint "
        "details using an LLM (category, department, priority, summary, "
        "location, keywords), detects semantically similar complaints "
        "already on file, routes the issue to the appropriate department, "
        "creates a ticket, and tracks its SLA deadline and escalation "
        "status until resolved."
    ),
    "source": "README.md",
    "topic": "about",
}

_ABOUT_CONTACT_DOC: Dict[str, Any] = {
    "id": "about-contact",
    "title": "Contact & Support",
    "text": (
        "GovPortal citizen support contacts: 24/7 Helpline 1800-425-0011. "
        "Email Grievance Desk: helpdesk@govportal.gov.in."
    ),
    "source": "govportal-citizen-assistant/src/pages/ServicesPage.tsx (AboutHelpPage)",
    "topic": "contact",
}


def get_all_documents() -> List[Dict[str, Any]]:
    """Every document in the knowledge base, each with a stable `id` (used
    for idempotent upsert -- see chatbot_knowledge_service.py), its `text`
    to embed, a human-friendly `title` (safe to show a citizen in the
    chatbot UI as a "source" -- never a raw file path), and a `source` for
    internal/test traceability back to the real repo content it came from.
    Deliberately contains no complaint data, no user data, and no invented
    policy."""
    documents = []
    documents.append(_build_sla_document())
    documents.extend(_build_department_documents())
    documents.extend(_build_civic_service_documents())
    documents.append(_ABOUT_PLATFORM_DOC)
    documents.append(_ABOUT_CONTACT_DOC)
    return documents
