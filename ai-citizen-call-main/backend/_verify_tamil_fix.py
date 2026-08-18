"""Post-fix verification: exactly 4 calls to POST /analyze (one per language
case requested), against the RUNNING backend on :8001. Run this once the
Gemini free-tier quota has reset -- it makes no more than 4 API calls.

    PYTHONIOENCODING=utf-8 venv/Scripts/python.exe _verify_tamil_fix.py
"""
import json
import urllib.request

BASE_URL = "http://127.0.0.1:8001"

CASES = {
    "1. Formal Tamil": "விழுப்புரத்தில் மூன்று நாட்களாக தண்ணீர் இல்லை.",
    "2. Colloquial Tamil": "ஐயா, ஒரு மூணு நாள் தண்ணி இல்லையா விழுப்புரத்துல?",
    "3. Tamil-English mixed (Tanglish)": "Sir, எங்க area la oru moonu naal ah water வரலை, Viluppuram.",
    "4. English (regression check)": "Hello sir, there has been no water for three days in Viluppuram.",
}

for label, transcript in CASES.items():
    payload = json.dumps({"transcript": transcript}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/analyze",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    print(f"\n===== {label} =====")
    print("Input:", transcript)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print("FAILED:", str(e)[:300])
