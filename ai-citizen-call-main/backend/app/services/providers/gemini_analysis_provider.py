"""Gemini complaint-analysis provider. This is the pre-existing Gemini
implementation (previously app/services/analysis_service.py's whole
module) relocated here unchanged as part of the GroqCloud integration --
app/services/analysis_service.py is now a thin dispatcher (see
app/services/providers/config.py's LLM_PROVIDER) so Gemini and Groq are
interchangeable, same-shaped providers behind one stable interface.
Nothing about Gemini's own behavior below was rewritten.
"""

import json
import logging
import os
import re
from typing import Any, Dict

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.services.providers.analysis_prompt import SYSTEM_PROMPT
from app.services.providers.analysis_schema import sanitize_analysis
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError

logger = logging.getLogger(__name__)

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


class GeminiAnalysisProvider:

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

        if not isinstance(data, dict):
            raise ValueError("LLM output is not a valid JSON object.")

        return sanitize_analysis(data)


gemini_analysis_provider = GeminiAnalysisProvider()
