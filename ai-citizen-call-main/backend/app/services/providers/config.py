"""Single source of truth for AI-provider selection and per-provider model
names -- every provider name and model name used anywhere in the app is
read from here, never hardcoded again elsewhere (see
app/services/analysis_service.py and app/services/whisper_service.py,
which are thin dispatchers reading these values).

LLM_PROVIDER / STT_PROVIDER default to the existing behavior ("gemini" /
"local") so an existing deployment without GROQ_API_KEY configured keeps
working completely unchanged. Set them to "groq" once GROQ_API_KEY is
provisioned to make GroqCloud the active provider for analysis and/or
transcription -- Gemini and local Whisper remain fully intact either way,
so switching back is just flipping the env var again.
"""

import os

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").strip().lower()
STT_PROVIDER = os.getenv("STT_PROVIDER", "local").strip().lower()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

# https://console.groq.com/docs/models -- Groq's catalog changes over time
# (confirmed live via client.models.list() during real-credentials
# verification on 2026-08-19: llama-3.3-70b-versatile, this integration's
# original default, no longer exists on the API -- 404 model_not_found).
# openai/gpt-oss-120b: general-purpose open-weight instruction-following
# chat model currently available on Groq, supports JSON-mode structured
# output, appropriate for a classification+extraction task like this one.
GROQ_LLM_MODEL = os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-120b").strip()

# Chatbot (RAG FAQ assistant, see app/services/chatbot_service.py) uses a
# plain conversational chat-completion call -- separate config from
# GROQ_LLM_MODEL above so the two can be tuned/changed independently
# without touching complaint-analysis behavior. Defaults to the same model
# unless overridden -- `.strip() or GROQ_LLM_MODEL`, not `os.getenv(...,
# GROQ_LLM_MODEL)`, because os.getenv's default only applies when the var
# is entirely unset, not when it's present-but-empty (e.g. a bare
# `GROQ_CHATBOT_MODEL=` line in .env, as .env.example ships).
GROQ_CHATBOT_MODEL = os.getenv("GROQ_CHATBOT_MODEL", "").strip() or GROQ_LLM_MODEL

# whisper-large-v3-turbo: Groq-hosted Whisper, materially faster than
# whisper-large-v3 with a small accuracy tradeoff -- appropriate for short
# citizen complaint recordings. Override to "whisper-large-v3" via env var
# if higher accuracy is preferred over latency.
GROQ_STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo").strip()

GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "30"))
GROQ_MAX_RETRIES = int(os.getenv("GROQ_MAX_RETRIES", "2"))
