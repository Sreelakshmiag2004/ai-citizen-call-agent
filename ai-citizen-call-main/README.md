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