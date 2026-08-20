# Citizen Call Intelligence

> **Multilingual AI-powered citizen complaint intelligence and routing platform**

Citizen Call Intelligence transforms citizen voice complaints into structured, actionable service tickets. The platform accepts multilingual audio, converts speech to text, extracts complaint intelligence using an LLM, detects semantically similar complaints, routes issues to the appropriate department, tracks SLA deadlines and escalations, and presents the resulting operational data through a React dashboard.

The system also supports **real phone-call ingestion through Twilio**, allowing a phone recording to enter the same processing pipeline as browser-uploaded audio.

---

## Overview

Traditional complaint-management workflows often depend on manual transcription, classification, routing, and duplicate identification. This creates delays and makes it difficult for officials to identify recurring issues and prioritize urgent complaints.

Citizen Call Intelligence automates this workflow:

```text
Citizen Voice / Phone Call
          │
          ▼
      Audio Input
          │
          ▼
  Multilingual Whisper STT
          │
          ▼
     LLM Analysis
          │
          ├── Category
          ├── Department
          ├── Priority
          ├── Summary
          ├── Location
          └── Keywords
          │
          ▼
 Semantic Duplicate Detection
        (ChromaDB)
          │
          ▼
 Complaint + Ticket
          │
          ├── Department Routing
          ├── SLA Deadline
          └── Escalation
          │
          ▼
     Analytics Layer
          │
          ▼
   React Operations Dashboard
```

---

## Quick Start (local development, Windows)

Prerequisites: the backend virtual environment already created at `backend/.venv` (with its dependencies installed) and `npm install` already run once in `govportal-citizen-assistant/`.

Run **`start-dev.bat`** from the repo root (double-click it, or `start-dev.bat` from a terminal). It opens two separate windows and leaves both running:

- **Backend** — FastAPI on `http://localhost:8001` (`backend/.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001`, run from `backend/`)
- **Frontend** — Vite dev server on `http://localhost:3000` (`npm run dev`, run from `govportal-citizen-assistant/`)

Close a window (or Ctrl+C inside it) to stop that process; the other keeps running independently.

Twilio/ngrok is **not** started by this script — that remains a separate, optional manual step for demoing the real phone-call path (see `MASTER_TODO.md`'s Twilio items).