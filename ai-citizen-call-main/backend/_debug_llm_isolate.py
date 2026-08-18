"""Isolate Path A (interactions.create) vs Path B (generate_content) on the
exact same Tamil input, with a wait-and-retry loop to ride out the free-tier
rate limit rather than burning more quota on failed attempts."""
import os
import re
import time
from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types

TAMIL = "ஐயா, ஒரு மூணு நாள் தண்ணி இல்லையா விழுப்புரத்துல?"

SYSTEM_PROMPT = open("_prompt.txt", encoding="utf-8").read() if os.path.exists("_prompt.txt") else None

api_key = os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
model_name = os.getenv("LLM_MODEL", "gemini-3.6-flash").strip()
client = genai.Client(api_key=api_key)


def call_with_retry(fn, label, max_wait=180):
    start = time.time()
    while time.time() - start < max_wait:
        try:
            return fn()
        except Exception as e:
            msg = str(e)
            m = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+)", msg)
            wait_s = int(m.group(1)) + 2 if m else 15
            print(f"[{label}] rate-limited, waiting {wait_s}s...")
            time.sleep(wait_s)
    raise RuntimeError(f"{label}: gave up after {max_wait}s")


SYS = """You are an AI government citizen complaint classification system.
Your job is to analyze unstructured citizen complaint transcripts (written in English, Tamil, Hindi, Telugu, Malayalam, Kannada, or any other language) and convert them into structured JSON.

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


def path_a():
    interaction = client.interactions.create(
        model=model_name,
        input=f"{SYS}\n\nCitizen Complaint Transcript: {TAMIL}",
    )
    return interaction.output_text


def path_b():
    response = client.models.generate_content(
        model=model_name,
        contents=f"Citizen Complaint Transcript: {TAMIL}",
        config=types.GenerateContentConfig(
            system_instruction=SYS,
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    return response.text


print("===== PATH A: interactions.create =====")
result_a = call_with_retry(path_a, "PathA")
print(result_a)

print("\n===== PATH B: generate_content (system_instruction + json mime) =====")
result_b = call_with_retry(path_b, "PathB")
print(result_b)
