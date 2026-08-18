"""Isolate which google-genai code path is actually executing for Tamil
input, and what each path returns. Standalone -- does not touch
analysis_service.py or any app code."""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types

TAMIL = "ஐயா, ஒரு மூணு நாள் தண்ணி இல்லையா விழுப்புரத்துல?"

SYSTEM_PROMPT = """You are an AI government citizen complaint classification system.
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

api_key = os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
model_name = os.getenv("LLM_MODEL", "gemini-3.6-flash").strip()
print("model_name:", model_name)
print("transcript repr:", repr(TAMIL))
print("transcript bytes (utf-8):", TAMIL.encode("utf-8")[:40], "...")

client = genai.Client(api_key=api_key)

print("\n===== PATH A: client.interactions.create (current primary path) =====")
try:
    interaction = client.interactions.create(
        model=model_name,
        input=f"{SYSTEM_PROMPT}\n\nCitizen Complaint Transcript: {TAMIL}",
    )
    print("output_text:", interaction.output_text)
except Exception as e:
    print("EXCEPTION:", type(e).__name__, str(e))

print("\n===== PATH B: client.models.generate_content (current fallback path) =====")
try:
    response = client.models.generate_content(
        model=model_name,
        contents=f"Citizen Complaint Transcript: {TAMIL}",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    print("response.text:", response.text)
except Exception as e:
    print("EXCEPTION:", type(e).__name__, str(e))
