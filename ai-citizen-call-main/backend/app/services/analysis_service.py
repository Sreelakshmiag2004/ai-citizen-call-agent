import json
import logging
import os
import re
from typing import Any, Dict

from google import genai
from google.genai import types
from google.genai.errors import APIError

logger = logging.getLogger(__name__)

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

DEPRECATED_MODELS = {
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
}

# Bounded timeout/retry policy for Gemini calls. A per-attempt timeout keeps
# a stalled connection from blocking a request indefinitely (the SDK default
# is no timeout at all). Retries are limited to transient server errors
# (408/5xx) -- 429 (quota exhausted) is deliberately excluded so it fails
# fast instead of being retried into a longer wait.
LLM_TIMEOUT_MS = int(os.getenv("LLM_TIMEOUT_MS", "15000"))
LLM_RETRY_ATTEMPTS = int(os.getenv("LLM_RETRY_ATTEMPTS", "2"))
LLM_RETRYABLE_STATUS_CODES = [408, 500, 502, 503, 504]


class LLMQuotaExceededError(RuntimeError):
    """Raised when the Gemini API reports quota/rate-limit exhaustion (HTTP 429).

    Subclasses RuntimeError so any existing `except RuntimeError` handling
    keeps working; callers that want to distinguish this case (e.g. to
    return HTTP 429 instead of 500) can catch it explicitly.
    """


class LLMUnavailableError(RuntimeError):
    """Raised when the Gemini API is temporarily unavailable (5xx) after the
    bounded retry policy above, or when the request times out.
    """

SYSTEM_PROMPT = """You are an AI government citizen complaint classification system.
Your job is to analyze unstructured citizen complaint transcripts (written in English, Tamil, Hindi, Telugu, Malayalam, Kannada, or any other language) and convert them into structured JSON.

IMPORTANT: Transcripts written in Tamil, Hindi, Telugu, Malayalam, Kannada, or any
other non-Latin script are completely normal input, not an error condition.
Read the script directly -- do NOT treat a transcript as "unreadable",
"corrupted", or unclassifiable merely because it is not in English or not in
the Latin alphabet. Only fall back to category "Other" / department "Other"
when the transcript is genuinely empty, is random noise with no discernible
words in any language, or truly does not describe an identifiable civic
complaint after reading it in its original language.

Rules:
1. Category: A descriptive English title for the complaint (e.g., "Water Supply", "Electricity Outage", "Road Damage", "Garbage Collection", "Street Lighting", "Public Safety", "Healthcare", "Public Transport", "Flooding", "Drainage", "Other").
2. Department: Must be EXACTLY one of these allowed values:
   - Water
   - Electricity
   - Roads
   - Sanitation
   - Healthcare
   - Police
   - Transport
   - Municipal
   - Disaster Management
   - Other

3. Priority: Must be EXACTLY one of these allowed values:
   - CRITICAL: Life-threatening emergencies, Fire, Major accidents, Building collapse, Flood threatening lives, Serious medical emergency, Dangerous electrical situations, Immediate public safety threats.
   - HIGH: No water for several days, Major electricity outage, Sewage overflow, Dangerous roads, Major public infrastructure failures, Significant public safety problems.
   - MEDIUM: Garbage collection problems, Broken street lights, Minor road damage, Routine service complaints.
   - LOW: General information requests, Non-urgent requests, Minor inquiries.

4. Summary: Concise 1-2 sentence summary of the complaint written in ENGLISH, regardless of the input language.
5. Location: Extract the location ONLY if explicitly mentioned in the transcript (e.g. "Anna Nagar", "MG Road"). If no location is explicitly mentioned, return null. NEVER invent or assume a location.
6. Keywords: An array of 2-5 relevant English keywords.

Output Format:
Return ONLY valid JSON matching this schema:
{
  "category": "string",
  "department": "string",
  "priority": "CRITICAL | HIGH | MEDIUM | LOW",
  "summary": "string",
  "location": "string | null",
  "keywords": ["string"]
}
Do NOT include markdown formatting, explanations, or code blocks.
"""


class AnalysisService:

    def analyze_complaint(self, transcript: str) -> Dict[str, Any]:
        if not transcript or not transcript.strip():
            raise ValueError("Transcript cannot be empty.")

        api_key = os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key or not api_key.strip():
            logger.error("LLM_API_KEY environment variable is missing or empty.")
            raise RuntimeError("LLM API key is not configured on the server.")

        env_model = os.getenv("LLM_MODEL", "gemini-3.6-flash").strip()
        if env_model.lower() in DEPRECATED_MODELS:
            logger.warning(
                "Requested model '%s' is deprecated by Gemini API. Substituting with 'gemini-3.6-flash'.",
                env_model,
            )
            model_name = "gemini-3.6-flash"
        else:
            model_name = env_model or "gemini-3.6-flash"

        raw_text = None
        try:
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    timeout=LLM_TIMEOUT_MS,
                    retry_options=types.HttpRetryOptions(
                        attempts=LLM_RETRY_ATTEMPTS,
                        http_status_codes=LLM_RETRYABLE_STATUS_CODES,
                        initial_delay=1.0,
                        max_delay=4.0,
                    ),
                ),
            )

            # Use generate_content with an explicit system_instruction and
            # response_mime_type="application/json" as the ONLY path.
            #
            # This used to try client.interactions.create() first (the
            # "NextGen Interactions" API) and only fall back to
            # generate_content() on an exception. That was the root cause of
            # a real multilingual bug: interactions.create() concatenates
            # the system prompt and the transcript into one flat string with
            # no system/user role separation, no response_mime_type (so
            # nothing forces strict JSON-schema output), and no temperature
            # control. It does not raise on non-English/Tamil-script input --
            # it returns a low-quality but well-formed completion (observed:
            # valid JSON claiming the transcript was "unreadable or
            # corrupted" for perfectly correct Tamil) -- so the fallback
            # never triggered and the bad result was returned as if it were
            # correct. generate_content() with an explicit system_instruction
            # and forced JSON output is the same, well-established API this
            # module already used as its (better-behaved) fallback; making
            # it the only path fixes this without touching anything else.
            response = client.models.generate_content(
                model=model_name,
                contents=f"Citizen Complaint Transcript: {transcript}",
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            raw_text = response.text

        except APIError as e:
            if e.code == 429:
                logger.warning("Gemini quota/rate limit exceeded (model=%s): %s", model_name, e)
                raise LLMQuotaExceededError("LLM quota exceeded. Please try again later.") from e
            logger.exception("Gemini API error (code=%s)", getattr(e, "code", "?"))
            raise LLMUnavailableError("LLM service is temporarily unavailable. Please try again later.") from e
        except Exception as e:
            logger.exception("LLM API call failed: %s", str(e))
            raise LLMUnavailableError("LLM API request timed out or failed. Please try again later.") from e

        if not raw_text:
            raise ValueError("Empty response received from LLM.")

        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON from LLM: %s", raw_text)
            raise ValueError("Invalid JSON returned by LLM.") from e

        return self._validate_and_sanitize(data)

    def _validate_and_sanitize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            raise ValueError("LLM output is not a valid JSON object.")

        # Category
        category = str(data.get("category", "Other")).strip() or "Other"

        # Department
        raw_dept = str(data.get("department", "Other")).strip()
        dept_match = next(
            (d for d in ALLOWED_DEPARTMENTS if d.lower() == raw_dept.lower()),
            "Other",
        )

        # Priority
        raw_priority = str(data.get("priority", "MEDIUM")).strip().upper()
        priority = raw_priority if raw_priority in ALLOWED_PRIORITIES else "MEDIUM"

        # Summary
        summary = str(data.get("summary", "")).strip()
        if not summary:
            summary = "No summary available."

        # Location
        raw_loc = data.get("location")
        if isinstance(raw_loc, str):
            clean_loc = raw_loc.strip()
            if clean_loc.lower() in {"null", "none", "n/a", "unknown", ""}:
                location = None
            else:
                location = clean_loc
        else:
            location = None

        # Keywords
        raw_keywords = data.get("keywords", [])
        if isinstance(raw_keywords, list):
            keywords = [str(k).strip() for k in raw_keywords if str(k).strip()]
        else:
            keywords = []

        return {
            "category": category,
            "department": dept_match,
            "priority": priority,
            "summary": summary,
            "location": location,
            "keywords": keywords,
        }


analysis_service = AnalysisService()
