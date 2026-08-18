"""Controlled debug test: run the audio directly against faster-whisper,
bypassing our API/service layers entirely, to isolate whether the problem
is in Whisper itself or in our processing layers."""
import sys
from faster_whisper import WhisperModel

AUDIO = "_debug_tamil_test.mp3"
EXPECTED = "ஹலோ, ஐயா, ஒரு நாளாக தண்ணி இல்லையா அண்ணா நகர்ல?"


def run(label, model_name, **transcribe_kwargs):
    print(f"\n===== {label} =====")
    print(f"model={model_name} kwargs={transcribe_kwargs}")
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments_iter, info = model.transcribe(AUDIO, **transcribe_kwargs)
    segments = list(segments_iter)
    transcript = " ".join(s.text.strip() for s in segments)
    print("Detected language:", info.language)
    print("Language probability:", round(info.language_probability, 4))
    print("Raw Whisper transcript:", transcript)
    print("Expected:              ", EXPECTED)
    print("Match:", transcript.strip() == EXPECTED.strip())
    return transcript


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "current"

    if which == "current":
        # EXACT current whisper_service.py behavior: no language, no
        # vad_filter, no task kwarg (defaults to "transcribe" internally).
        run("CURRENT CONFIG (small, auto-detect language)", "small", beam_size=5)

    elif which == "ta":
        # Same "small" model, but explicit language="ta", task="transcribe",
        # vad_filter=True as the user asked us to test.
        run(
            "small MODEL + language=ta",
            "small",
            task="transcribe",
            language="ta",
            beam_size=5,
            vad_filter=True,
        )

    elif which == "large-v3":
        run(
            "large-v3 MODEL + language=ta (recommended config)",
            "large-v3",
            task="transcribe",
            language="ta",
            beam_size=5,
            vad_filter=True,
        )

    elif which == "large-v3-auto":
        run(
            "large-v3 MODEL + auto-detect language",
            "large-v3",
            task="transcribe",
            beam_size=5,
            vad_filter=True,
        )
