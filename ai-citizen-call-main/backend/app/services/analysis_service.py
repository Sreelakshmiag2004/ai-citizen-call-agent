"""Complaint-analysis dispatcher -- routes to whichever LLM provider is
configured (app/services/providers/config.py's LLM_PROVIDER: "gemini"
[default] or "groq"). This module is the STABLE public interface every
caller already imports (app/routes/analysis.py, app/routes/complaints.py's
run_audio_pipeline) and its shape never changes regardless of which
provider is active -- see app/services/providers/ for the actual Gemini
and Groq implementations. Re-exports LLMQuotaExceededError /
LLMUnavailableError so existing `from app.services.analysis_service import
LLMQuotaExceededError, LLMUnavailableError, analysis_service` imports keep
working unchanged.
"""

import logging
from typing import Any, Dict

from app.services.providers import config
from app.services.providers.exceptions import LLMQuotaExceededError, LLMUnavailableError  # noqa: F401 (re-exported)
from app.services.providers.gemini_analysis_provider import gemini_analysis_provider
from app.services.providers.groq_provider import groq_analysis_provider

logger = logging.getLogger(__name__)


class AnalysisService:

    def analyze_complaint(self, transcript: str) -> Dict[str, Any]:
        if config.LLM_PROVIDER == "groq":
            return groq_analysis_provider.analyze_complaint(transcript)
        return gemini_analysis_provider.analyze_complaint(transcript)


analysis_service = AnalysisService()
