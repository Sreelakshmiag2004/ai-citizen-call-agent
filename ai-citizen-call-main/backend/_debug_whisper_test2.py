"""Round 2 controlled debug: large-v3, temperature/condition_on_previous_text
variants, initial_prompt experiment, and a formal-vs-colloquial comparison.
Standalone -- does not touch whisper_service.py or any app code."""
import sys
import time
from faster_whisper import WhisperModel

COLLOQUIAL_AUDIO = "_debug_tamil_colloquial.mp3"
FORMAL_AUDIO = "_debug_tamil_formal.mp3"
EXPECTED_COLLOQUIAL = "ஐயா, ஒரு மூணு நாள் தண்ணி இல்லையா விழுப்புரத்துல?"
EXPECTED_FORMAL = "என் பெயர் ராமு. நான் சென்னையில் வசிக்கிறேன். இன்று வானிலை மிகவும் வெப்பமாக உள்ளது."

PROMPT_VOCAB = (
    "தண்ணி, தண்ணீர், குடிநீர், ஐயா, அண்ணா, அக்கா, நாள், மூணு நாள், "
    "விழுப்புரம், சென்னை, அண்ணா நகர், தண்ணி இல்ல, தண்ணீர் இல்லை"
)


def run(model, label, audio, expected, **kwargs):
    print(f"\n===== {label} =====")
    print(f"audio={audio} kwargs={kwargs}")
    t0 = time.time()
    segments_iter, info = model.transcribe(audio, **kwargs)
    segments = list(segments_iter)
    transcript = " ".join(s.text.strip() for s in segments)
    dt = time.time() - t0
    print("Detected language:", info.language)
    print("Language probability:", round(info.language_probability, 4))
    print("Raw transcript:", transcript)
    print("Expected:      ", expected)
    print("Match:", transcript.strip() == expected.strip())
    print(f"(took {dt:.1f}s)")
    return transcript


if __name__ == "__main__":
    print("Loading large-v3 (device=cpu, compute_type=int8)...")
    t0 = time.time()
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")
    print(f"Model loaded in {time.time()-t0:.1f}s")

    # 1) Recommended baseline config on the colloquial sentence
    run(
        model, "large-v3 baseline (language=ta, beam_size=5, vad_filter=True)",
        COLLOQUIAL_AUDIO, EXPECTED_COLLOQUIAL,
        language="ta", task="transcribe", beam_size=5, vad_filter=True,
    )

    # 2) + temperature=0, condition_on_previous_text=False
    run(
        model, "large-v3 + temperature=0 + condition_on_previous_text=False",
        COLLOQUIAL_AUDIO, EXPECTED_COLLOQUIAL,
        language="ta", task="transcribe", beam_size=5, vad_filter=True,
        temperature=0, condition_on_previous_text=False,
    )

    # 3) + initial_prompt experiment (vocabulary hint, not a hardcoded fix)
    run(
        model, "large-v3 + initial_prompt (Tamil complaint vocabulary)",
        COLLOQUIAL_AUDIO, EXPECTED_COLLOQUIAL,
        language="ta", task="transcribe", beam_size=5, vad_filter=True,
        temperature=0, condition_on_previous_text=False,
        initial_prompt=PROMPT_VOCAB,
    )

    # 4) Formal/clean control sentence -- same model+params, no colloquial words
    run(
        model, "large-v3 on FORMAL/clean Tamil (control)",
        FORMAL_AUDIO, EXPECTED_FORMAL,
        language="ta", task="transcribe", beam_size=5, vad_filter=True,
        temperature=0, condition_on_previous_text=False,
    )
