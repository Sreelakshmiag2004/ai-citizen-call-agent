"""Local faster-whisper transcription provider. This is the pre-existing
implementation (previously the entirety of app/services/whisper_service.py)
relocated here unchanged as part of the GroqCloud integration --
app/services/whisper_service.py is now a thin dispatcher (see
app/services/providers/config.py's STT_PROVIDER) so this and the Groq
Whisper provider are interchangeable, same-shaped providers behind one
stable interface. Nothing about this provider's own behavior was rewritten.
"""

from faster_whisper import WhisperModel


class LocalWhisperProvider:

    def __init__(self):
        self._model = None

    @property
    def model(self) -> WhisperModel:
        if self._model is None:
            self._model = WhisperModel(
                "small",
                device="cpu",
                compute_type="int8",
            )
        return self._model

    def transcribe(self, audio_path: str) -> dict:
        segments_iter, info = self.model.transcribe(
            audio_path,
            beam_size=5,
        )

        segments = []
        transcript_parts = []

        for segment in segments_iter:
            text = segment.text.strip()
            segments.append(
                {
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": text,
                }
            )
            if text:
                transcript_parts.append(text)

        return {
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "transcript": " ".join(transcript_parts),
            "segments": segments,
        }


local_whisper_provider = LocalWhisperProvider()
