"""Speech-to-text dispatcher -- routes to whichever STT provider is
configured (app/services/providers/config.py's STT_PROVIDER: "local"
[default, faster-whisper] or "groq"). This module is the STABLE public
interface every caller already imports (app/routes/transcription.py,
app/routes/analysis.py, app/routes/complaints.py's run_audio_pipeline,
app/main.py's startup hook) and its shape never changes regardless of
which provider is active -- see app/services/providers/ for the actual
local-whisper and Groq implementations.
"""

from app.services.providers import config
from app.services.providers.groq_provider import groq_transcription_provider
from app.services.providers.local_whisper_provider import local_whisper_provider


class WhisperService:

    @property
    def model(self):
        """Preserves the existing eager-load-at-startup hook in
        app/main.py's _load_whisper_model() (`_ = whisper_service.model`),
        which only makes sense for the local faster-whisper model -- Groq
        is a remote API with nothing to preload, so this is a no-op when
        STT_PROVIDER=groq rather than an error."""
        if config.STT_PROVIDER == "groq":
            return None
        return local_whisper_provider.model

    def transcribe(self, audio_path: str) -> dict:
        if config.STT_PROVIDER == "groq":
            return groq_transcription_provider.transcribe(audio_path)
        return local_whisper_provider.transcribe(audio_path)


whisper_service = WhisperService()
