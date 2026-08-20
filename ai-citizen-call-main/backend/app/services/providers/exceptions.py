"""Shared exception types for AI provider calls -- both LLM analysis
(Gemini/Groq) and speech-to-text (local faster-whisper/Groq Whisper) map
their own SDK-specific failures onto this same small set of types, so the
rest of the app (app/routes/analysis.py, app/routes/complaints.py) handles
"the AI provider failed" identically no matter which provider is active.
See MASTER_TODO.md-adjacent GroqCloud integration -- app/services/providers/.
"""


class LLMQuotaExceededError(RuntimeError):
    """The AI provider reported quota/rate-limit exhaustion (HTTP 429)."""


class LLMUnavailableError(RuntimeError):
    """The AI provider is temporarily unavailable (5xx / timeout / auth
    failure / connection error) after any provider-side retry policy."""
