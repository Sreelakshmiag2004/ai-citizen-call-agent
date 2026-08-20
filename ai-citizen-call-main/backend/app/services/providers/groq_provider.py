"""GroqCloud providers: LLM complaint analysis (GroqAnalysisProvider),
Whisper speech-to-text (GroqTranscriptionProvider), and plain
conversational chat completion for the RAG chatbot (GroqChatProvider) --
all via GroqCloud's OpenAI-compatible API. This is the ONLY module in the
app that imports the `groq` SDK -- app/services/analysis_service.py,
app/services/whisper_service.py, and app/services/chatbot_service.py all
dispatch to this module (see app/services/providers/config.py's
LLM_PROVIDER / STT_PROVIDER / GROQ_CHATBOT_MODEL) without knowing anything
about Groq specifically, so the rest of the application never depends on
the Groq SDK directly.

All three providers raise the same LLMQuotaExceededError /
LLMUnavailableError used by the Gemini provider -- see
app/services/providers/exceptions.py -- so existing error handling in
app/routes/analysis.py, app/routes/complaints.py, and app/routes/chatbot.py
(429 / 503 mapping) works unchanged regardless of which provider is
active. None of these providers ever fabricates a result: every failure
path raises instead of returning synthesized/placeholder data.

GroqChatProvider is deliberately Groq-only (no Gemini equivalent): Gemini
has never had a conversational chat method in this codebase, only the
JSON-mode complaint-analysis one in gemini_analysis_provider.py, and
adding one was not part of this feature's scope -- the chatbot always
uses Groq, matching this project's current active-provider configuration.
"""

import json
import logging
import re
from typing import Any, Dict

from groq import Groq
from groq import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)
from pydantic import ValidationError

from app.services.providers import config
from app.services.providers.analysis_prompt import SYSTEM_PROMPT
from app.services.providers.analysis_schema import ComplaintAnalysisSchema, sanitize_analysis
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError

logger = logging.getLogger(__name__)


def _require_api_key() -> str:
    if not config.GROQ_API_KEY:
        logger.error("GROQ_API_KEY environment variable is missing or empty.")
        raise RuntimeError("Groq API key is not configured on the server.")
    return config.GROQ_API_KEY


def _client() -> Groq:
    return Groq(
        api_key=_require_api_key(),
        timeout=config.GROQ_TIMEOUT_SECONDS,
        max_retries=config.GROQ_MAX_RETRIES,
    )


class GroqAnalysisProvider:
    """Complaint analysis via a Groq-hosted chat model (see
    config.GROQ_LLM_MODEL). Requests JSON-mode output constrained by the
    same SYSTEM_PROMPT contract Gemini uses, then validates the result
    against ComplaintAnalysisSchema before any of it reaches the complaint
    pipeline -- this is the "structured output/schema validation" step for
    Groq specifically, since JSON mode alone only guarantees valid JSON,
    not the right shape.
    """

    def analyze_complaint(self, transcript: str) -> Dict[str, Any]:
        if not transcript or not transcript.strip():
            raise ValueError("Transcript cannot be empty.")

        client = _client()
        model_name = config.GROQ_LLM_MODEL

        raw_text = None
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Citizen Complaint Transcript: {transcript}"},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            raw_text = response.choices[0].message.content
        except RateLimitError as e:
            logger.warning("Groq quota/rate limit exceeded (model=%s): %s", model_name, e)
            raise LLMQuotaExceededError("Groq LLM quota exceeded. Please try again later.") from e
        except AuthenticationError as e:
            logger.error("Groq authentication failed (check GROQ_API_KEY): %s", e)
            raise LLMUnavailableError("Groq API authentication failed. Please check server configuration.") from e
        except APITimeoutError as e:
            logger.warning("Groq API request timed out (model=%s): %s", model_name, e)
            raise LLMUnavailableError("Groq LLM request timed out. Please try again later.") from e
        except APIConnectionError as e:
            logger.warning("Unable to reach Groq API: %s", e)
            raise LLMUnavailableError("Unable to reach Groq API. Please try again later.") from e
        except APIStatusError as e:
            if e.status_code == 429:
                logger.warning("Groq quota/rate limit exceeded (model=%s): %s", model_name, e)
                raise LLMQuotaExceededError("Groq LLM quota exceeded. Please try again later.") from e
            logger.exception("Groq API error (status=%s)", e.status_code)
            raise LLMUnavailableError("Groq LLM service is temporarily unavailable. Please try again later.") from e
        except Exception as e:
            logger.exception("Groq LLM API call failed: %s", str(e))
            raise LLMUnavailableError("Groq LLM request failed. Please try again later.") from e

        if not raw_text:
            raise ValueError("Empty response received from Groq LLM.")

        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON from Groq LLM: %s", raw_text)
            raise ValueError("Invalid JSON returned by Groq LLM.") from e

        if not isinstance(data, dict):
            raise ValueError("Groq LLM output is not a valid JSON object.")

        # Schema validation BEFORE this touches the complaint pipeline --
        # catches wrong-shaped fields (e.g. keywords as a string instead of
        # a list) that valid-JSON-but-wrong-shape output could otherwise
        # smuggle through.
        try:
            validated = ComplaintAnalysisSchema.model_validate(data)
        except ValidationError as e:
            logger.error("Groq LLM output failed schema validation: %s | raw=%s", e, raw_text)
            raise ValueError("Groq LLM output did not match the expected structured schema.") from e

        return sanitize_analysis(validated.model_dump())


class GroqTranscriptionProvider:
    """Speech-to-text via Groq-hosted Whisper (see config.GROQ_STT_MODEL).
    Returns the exact same shape local_whisper_provider.transcribe() does
    (`language`, `language_probability`, `transcript`, `segments`) so
    callers never need to know which one produced it."""

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        client = _client()
        model_name = config.GROQ_STT_MODEL

        try:
            with open(audio_path, "rb") as f:
                response = client.audio.transcriptions.create(
                    model=model_name,
                    file=f,
                    response_format="verbose_json",
                )
        except RateLimitError as e:
            logger.warning("Groq STT quota/rate limit exceeded (model=%s): %s", model_name, e)
            raise LLMQuotaExceededError("Groq transcription quota exceeded. Please try again later.") from e
        except AuthenticationError as e:
            logger.error("Groq authentication failed (check GROQ_API_KEY): %s", e)
            raise LLMUnavailableError("Groq API authentication failed. Please check server configuration.") from e
        except APITimeoutError as e:
            logger.warning("Groq STT request timed out (model=%s): %s", model_name, e)
            raise LLMUnavailableError("Groq transcription request timed out. Please try again later.") from e
        except APIConnectionError as e:
            logger.warning("Unable to reach Groq API: %s", e)
            raise LLMUnavailableError("Unable to reach Groq API. Please try again later.") from e
        except APIStatusError as e:
            if e.status_code == 429:
                logger.warning("Groq STT quota/rate limit exceeded (model=%s): %s", model_name, e)
                raise LLMQuotaExceededError("Groq transcription quota exceeded. Please try again later.") from e
            logger.exception("Groq STT API error (status=%s)", e.status_code)
            raise LLMUnavailableError("Groq transcription service is temporarily unavailable. Please try again later.") from e
        except Exception as e:
            logger.exception("Groq transcription call failed: %s", str(e))
            raise LLMUnavailableError("Groq transcription request failed. Please try again later.") from e

        payload = response.model_dump()

        segments = [
            {
                "start": round(float(s.get("start", 0.0)), 2),
                "end": round(float(s.get("end", 0.0)), 2),
                "text": (s.get("text") or "").strip(),
            }
            for s in (payload.get("segments") or [])
        ]

        return {
            "language": payload.get("language") or "en",
            # Groq's Whisper API does not return a per-language confidence
            # score the way local faster-whisper's `info.language_probability`
            # does -- there is no equivalent value to report, and inventing
            # one would misrepresent confidence. 1.0 is a documented
            # placeholder, not a fabricated measurement.
            "language_probability": 1.0,
            "transcript": (payload.get("text") or "").strip(),
            "segments": segments,
        }


class GroqChatProvider:
    """Plain conversational chat completion for the RAG chatbot (see
    app/services/chatbot_service.py) -- unlike GroqAnalysisProvider, this
    does NOT use JSON-mode/response_format or any structured-output schema
    validation, since a chatbot reply is free-form prose grounded by a
    caller-supplied system prompt, not a fixed-shape extraction result.
    Reuses the same client/error-mapping conventions as the other two
    providers in this module."""

    def generate_reply(self, system_prompt: str, user_message: str) -> str:
        if not user_message or not user_message.strip():
            raise ValueError("User message cannot be empty.")

        client = _client()
        model_name = config.GROQ_CHATBOT_MODEL

        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.2,
                max_tokens=500,
            )
            reply = response.choices[0].message.content
        except RateLimitError as e:
            logger.warning("Groq chatbot quota/rate limit exceeded (model=%s): %s", model_name, e)
            raise LLMQuotaExceededError("Groq chatbot quota exceeded. Please try again later.") from e
        except AuthenticationError as e:
            logger.error("Groq authentication failed (check GROQ_API_KEY): %s", e)
            raise LLMUnavailableError("Groq API authentication failed. Please check server configuration.") from e
        except APITimeoutError as e:
            logger.warning("Groq chatbot request timed out (model=%s): %s", model_name, e)
            raise LLMUnavailableError("Groq chatbot request timed out. Please try again later.") from e
        except APIConnectionError as e:
            logger.warning("Unable to reach Groq API: %s", e)
            raise LLMUnavailableError("Unable to reach Groq API. Please try again later.") from e
        except APIStatusError as e:
            if e.status_code == 429:
                logger.warning("Groq chatbot quota/rate limit exceeded (model=%s): %s", model_name, e)
                raise LLMQuotaExceededError("Groq chatbot quota exceeded. Please try again later.") from e
            logger.exception("Groq chatbot API error (status=%s)", e.status_code)
            raise LLMUnavailableError("Groq chatbot service is temporarily unavailable. Please try again later.") from e
        except Exception as e:
            logger.exception("Groq chatbot request failed: %s", str(e))
            raise LLMUnavailableError("Groq chatbot request failed. Please try again later.") from e

        if not reply or not reply.strip():
            raise ValueError("Empty response received from Groq chatbot model.")

        return reply.strip()


groq_analysis_provider = GroqAnalysisProvider()
groq_transcription_provider = GroqTranscriptionProvider()
groq_chat_provider = GroqChatProvider()
