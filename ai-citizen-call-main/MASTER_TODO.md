# MASTER TODO — Citizen Call Intelligence

> Living document. Maintained across sessions — do not duplicate items; mark
> ✅ COMPLETED in place when resolved, add new items under the correct
> section when discovered. Every item below is based on direct inspection
> of the repository and/or the running backend, not assumption.
>
> Last updated: 2026-08-18

---

## 🔴 MUST FIX
*Issues that can break the project/demo or seriously affect the presentation.*

- [ ] **Demo database contains test/regression fixture data mixed with real complaints**
  - **Status:** Confirmed live via `GET /complaints?category=Test` — 15 of 25 total complaints have category `"Test"`, transcripts like `"regress test 4"`, `"regress custom"`, `"duplicate id retest"`, and IDs like `CMP-REGRESS-XYZ789` / `CMP-HTTP-9001`. These come from running `test_api_endpoints.py` / `test_module*.py` against the live dev database (there is no separate test DB — `database.py` always points at `backend/data/citizen_intelligence.db`).
  - **What's already completed:** At least one confirmed genuine end-to-end AI-processed complaint exists in the same DB (`CMP-DRAFT-1786976788097` — real Gemini-written summary, real extracted keywords, real duplicate-detection similarity score `0.7862`), proving the live pipeline itself works correctly.
  - **What remains:** Decide whether to reset `backend/data/citizen_intelligence.db` + `backend/data/chroma/` (or otherwise clean the data) before presenting — this directly affects what the newly-added Admin Dashboard analytics panels (Category/Priority/Status/Department) will visibly show tomorrow (currently "Test" would appear as the largest category slice).
  - **Priority:** High
  - **Required before presentation:** Yes

---

## 🟠 IMPORTANT
*Features/integrations that are incomplete and should ideally be completed.*

- [ ] **No authentication/authorization anywhere**
  - **Status:** Confirmed — `AppContext.login()` assigns a portal (citizen/officer/admin/call-center) purely by pattern-matching the text typed into the login field; no JWT/session exists; the backend has no auth-checking dependency on any route, so `GET /complaints` returns every complaint to any caller regardless of "role."
  - **What's already completed:** N/A — never implemented, by design so far.
  - **What remains:** A real backend session/token system and per-role authorization checks. Non-trivial scope.
  - **Priority:** High (long-term), not a blocker for a demo
  - **Required before presentation:** No — but be ready to proactively explain this is a known, disclosed limitation if asked.

- [ ] **SLA breach/escalation has no actual delivery mechanism**
  - **Status:** `sla_service.py` correctly computes `escalation_level` (0/1/2) and `escalated_at` on every read, but nothing acts on it — no email/SMS/push/webhook fires when a complaint breaches its deadline.
  - **What's already completed:** Detection/computation logic is fully correct and live-verified (`sla_breached: 7` in `/analytics/summary`).
  - **What remains:** Any real notification channel (would require both a backend delivery mechanism and likely a background scheduler, since state is currently computed only on-read).
  - **Priority:** Medium
  - **Required before presentation:** No

- [ ] **Citizen feedback (rating/comment) is not persisted to the backend**
  - **Status:** `addComplaintFeedback()` in `AppContext.tsx` writes feedback only into React state; the backend has no feedback endpoint or DB column at all.
  - **What's already completed:** The UI flow (star rating + comment) works locally within a session.
  - **What remains:** A backend endpoint + DB column, and wiring the frontend to call it — this would require a backend change.
  - **Priority:** Medium
  - **Required before presentation:** No

- [ ] **Twilio phone-call flow is fully coded but not yet exercised with a real call**
  - **Status:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` are all set (non-empty) in `backend/.env`. `TWILIO_PUBLIC_BASE_URL` is still the placeholder value `https://your-url.ngrok-free.app`.
  - **What's already completed:** `/twilio/voice` and `/twilio/recording` are fully implemented, signature-validated, and covered by 6 passing tests in `test_module8.py` (Twilio network calls mocked, pipeline calls real).
  - **What remains:** Start a public HTTPS tunnel (e.g. ngrok), set `TWILIO_PUBLIC_BASE_URL` to that real URL, point the Twilio Console's Voice webhook at `<that-url>/twilio/voice` (POST), and place one real test call.
  - **Priority:** High if a phone-call demo is planned, otherwise Low
  - **Required before presentation:** Only if you intend to demo the phone-call path

- [ ] **No rate limiting on any backend endpoint**
  - **Status:** Verified — `backend/requirements.txt` and `backend/app/` contain no rate-limiting library (`slowapi`, or any hand-rolled limiter) or middleware. Every endpoint, including the paid-per-call Gemini analysis endpoint (`/analyze`, `/process-complaint`, `/process-and-create-ticket`), can be called an unlimited number of times per second by any client.
  - **What's already completed:** N/A — never implemented.
  - **What remains:** Add request throttling (e.g. per-IP or per-endpoint) if this is ever exposed beyond a local demo — relevant both as an abuse vector and as an uncapped Gemini API cost risk.
  - **Priority:** Medium
  - **Required before presentation:** No

- [ ] **File upload validation is extension-only, with no size limit**
  - **Status:** Verified — `_validate_audio_file()` (repeated in `transcription.py`, `analysis.py`, `complaints.py`) only checks the filename's extension against `{.wav, .mp3, .m4a, .webm, .mp4}`; there is no content-type/magic-byte check confirming the file is really audio, and no `MAX_...SIZE` limit anywhere in the upload path — a client can upload an arbitrarily large file under an allowed extension.
  - **What's already completed:** Extension whitelist and empty-file rejection are implemented.
  - **What remains:** Content-type/magic-byte verification and a maximum upload size limit.
  - **Priority:** Medium
  - **Required before presentation:** No

---

## 🟡 OPTIONAL / IMPROVEMENTS
*Things that can remain unfinished without affecting the core project.*

- [ ] Production JS bundle for `govportal-citizen-assistant` exceeds Vite's 500 kB chunk-size advisory (currently 570.89 kB / 130.59 kB gzipped) — no code-splitting implemented. Build succeeds regardless; cosmetic warning only.
  - **Priority:** Low — **Required before presentation:** No
- [ ] `govportal-citizen-assistant/README.md` is still the generic "Google AI Studio" boilerplate text, not project-specific setup documentation.
  - **Priority:** Low — **Required before presentation:** No
- [ ] No single root-level "how to run this" doc tying backend + frontend startup steps together (`README.md` currently only describes architecture, not run commands).
  - **Priority:** Low — **Required before presentation:** No
- [ ] No fallback/degraded mode if the Gemini API is down or quota-exhausted — `analysis_service.py` has solid timeout/retry handling and correctly distinguishes 429 (quota) from 5xx (unavailable), but there is no secondary model or degraded path; a Gemini outage means the whole pipeline stops at the analysis step.
  - **Priority:** Low — **Required before presentation:** No
- [ ] No database migration framework — the only schema-evolution mechanism is one hand-written additive shim (`ensure_keywords_column()` in `database.py`) run on every startup; any future schema change would need the same ad-hoc pattern (or a real tool like Alembic).
  - **Priority:** Low — **Required before presentation:** No
- [ ] No automated frontend test coverage for `govportal-citizen-assistant` — no Jest/Vitest/React Testing Library/Cypress/Playwright setup exists; `npm run lint` only runs `tsc --noEmit` (type-checking), which catches type errors but not behavioral regressions.
  - **Priority:** Low — **Required before presentation:** No

---

## ⚙️ CONFIGURATION PENDING
*Credentials, API keys, .env variables, URLs, Twilio configuration, external services, deployment configuration.*

- [ ] **`TWILIO_PUBLIC_BASE_URL`** — currently the literal placeholder `https://your-url.ngrok-free.app`. Must be replaced with a real tunnel URL before any Twilio call can be signature-validated or routed correctly.
- [ ] **Twilio Console webhook** — cannot be verified by inspecting the repo (it's external). Confirm the phone number's Voice configuration → "A call comes in" is set to `POST https://<your-real-public-url>/twilio/voice`.
- [ ] **`LLM_API_KEY` freshness check** — key is present (53 characters, consistent with a real Gemini key) and has already produced at least one confirmed successful real analysis in the live DB, so risk is low — but external API keys can expire or hit quota, worth a final live `/analyze` check close to presentation time.
- [x] ✅ COMPLETED — `TWILIO_ACCOUNT_SID` set
- [x] ✅ COMPLETED — `TWILIO_AUTH_TOKEN` set
- [x] ✅ COMPLETED — `TWILIO_PHONE_NUMBER` set
- [x] ✅ COMPLETED — `.env` correctly excluded from git via root `.gitignore` (verified — `backend/.env` is **not** tracked by git; no secrets-hygiene issue exists here, correcting an earlier unverified assumption from this conversation)
- [ ] **No production deployment configuration exists** — verified: no `Dockerfile`, `docker-compose.yml`, `Procfile`, or `.github/workflows/` CI pipeline anywhere in the repo. The backend also has no explicit start command baked into any script — port `8001` is only an inferred convention (from the frontend's `VITE_API_URL` default and the test scripts), not enforced anywhere in code. Running it currently requires manually invoking `uvicorn app.main:app --port 8001` from `backend/`.
  - **Priority:** Low for a local presentation, Medium if asked "how would you deploy this"
  - **Required before presentation:** No

---

## 🧪 TESTING PENDING
*Features that are implemented but still need real end-to-end testing.*

- [ ] **Run the existing backend test suite fresh** (`test_module3.py`, `test_module4.py`, `test_module5.py`, `test_module6.py`, `test_module8.py`, `test_api_endpoints.py`) — not executed during this session. Note: these scripts write directly into the live dev database (this is the source of the test-pollution issue in 🔴 MUST FIX), so consider running them against a disposable copy of the DB rather than the presentation DB.
- [ ] **One real end-to-end voice recording** (browser mic → Whisper → Gemini → ChromaDB → ticket, via `VoiceRecordingStep.tsx`) has not been directly observed in this session — only one clearly-real *text-path* complaint was identified in the DB. Recommend one live voice-recording run before presenting to be fully confident.
- [ ] **One real Twilio phone call end-to-end** — not yet tested (see Twilio items above).
- [ ] **Manual click-through of Officer, Admin, and Call-Center portals** to visually confirm nothing broke from the Admin Dashboard analytics change. `tsc --noEmit` and `vite build` both passed, but the app was not visually rendered in a browser this session.
- [x] ✅ COMPLETED — New Admin Dashboard analytics panels (Category / Priority / Status) tested against the live backend: confirmed `/analytics/categories`, `/analytics/priorities`, `/analytics/status`, `/analytics/departments` all return correct real data shapes and non-empty results.
- [x] ✅ COMPLETED — `govportal-citizen-assistant` type-check (`tsc --noEmit`) passes.
- [x] ✅ COMPLETED — `govportal-citizen-assistant` production build (`vite build`) passes, before and after `frontend/` removal.
- [x] ✅ COMPLETED — Backend confirmed still responding (`GET /` → 200, `GET /analytics/summary` → real data) after `frontend/` removal.

---

## 🎭 MOCK / DEMO FEATURES
*Features that currently exist only as mock, hardcoded, scripted, or demo implementations.*

- [ ] **Login/role routing** (citizen/officer/admin/call-center) — keyword-matched client-side in `AppContext.login()`, not backed by real accounts or a backend session.
- [ ] **Portal chatbot** ("GovPortal Assistant" widget) — hardcoded if/else keyword logic in `AppContext.handleBotResponse()`; never calls Gemini or any backend endpoint despite appearing AI-powered.
- [ ] **Admin portal:** user management, department management, call-center management, audit logs — all rendered from static mock data (`adminData.ts`); no backend-modeled entities exist for any of these.
- [ ] **Call-center portal:** live calls and exceptions — static mock data (`callCenterData.ts`); no backend live-call/exception feed exists.
- [ ] **Officer portal:** notifications and profile — static mock data (`officerData.ts`).
- [ ] **Notifications across all 4 portals** — in-memory React state only (`mockData.ts`'s `INITIAL_NOTIFICATIONS` + each portal's mock list), not generated by or persisted to the backend.
- [ ] **Citizen feedback ratings** — same item as 🟠 IMPORTANT above; local-only, not sent to backend.

---

## 🗑️ CLEANUP / REDUNDANT
*Unused, duplicate, obsolete, or unnecessary code/features.*

- [x] ✅ COMPLETED — `frontend/` directory (33 files) removed. Its only unique functionality (4 analytics visualizations: departments/categories/priorities/status) was migrated into `govportal-citizen-assistant`'s Admin Dashboard first, using the already-existing `getAnalyticsCategories/Priorities/Status()` functions in `services/api.ts` — no API logic duplicated. Verified via type-check, build, and live backend calls before deletion.
- [ ] **`.claude/launch.json`** still contains a `"frontend-dev"` launch entry (`npm --prefix frontend run dev --port 5173`) pointing at the now-deleted directory — will error if invoked. Recommend removing this entry.
- [ ] **`backend/app/main.py` CORS allowlist** still permits `http://localhost:5173` / `http://127.0.0.1:5173` (the deleted `frontend/`'s old dev port). No longer needed by anything in the repo; harmless if left (an unused allowed origin has no security impact), but removable for tidiness.
- [ ] **`TWILIO_PHONE_NUMBER` is read but never used anywhere in application logic** — verified via repo-wide grep: `twilio_service.py` defines a `phone_number` property that reads the env var, but nothing else in the codebase references it (no validation, no routing decision depends on it). Safe to leave set in `.env` for your own records; the property itself is dead code.
- [ ] **`INITIAL_COMPLAINTS` in `govportal-citizen-assistant/src/data/mockData.ts` is exported but never imported/used anywhere** — verified via grep: the only occurrence of the name in `src/` is its own definition. `AppContext.tsx` only imports `INITIAL_NOTIFICATIONS` and `INITIAL_USER` from that file. Dead mock data left over from before the real backend was wired in.
- [ ] **`motion` npm dependency in `govportal-citizen-assistant/package.json` is installed but never imported anywhere in `src/`** — verified via grep across all source files; zero matches for `from 'motion'` or equivalent. Unused dependency adding to install size and the production bundle unless it's tree-shaken out.
- [ ] **Leftover debug/scratch files at `backend/` root** — `_debug_audio_info.py`, `_debug_audio_info2.py`, `_debug_gen_audio.py`, `_debug_gen_audio2.py`, `_debug_llm_isolate.py`, `_debug_llm_test.py`, `_debug_whisper_test.py`, `_debug_whisper_test2.py`, `_verify_tamil_fix.py`, plus three debug audio fixtures (`_debug_tamil_colloquial.mp3`, `_debug_tamil_formal.mp3`, `_debug_tamil_test.mp3`). Verified via grep: none of these are imported or referenced by `app/` or by any `test_module*.py` / `test_api_endpoints.py`. These appear to be scratch scripts from debugging the Tamil-language analysis bug (referenced in `analysis_service.py`'s comments) and are safe candidates for removal, but confirm they're not something you still want for reference before deleting.

---

## CURRENT REMAINING WORK (summary — unfinished items only)

**Before presentation (recommended):**
1. 🔴 Clean up or reset the test-polluted demo database so the new Analytics panels show presentation-appropriate data.
2. 🧪 Do one live end-to-end voice-recording test through the real UI.
3. 🧪 Manually click through Officer/Admin/Call-Center portals once in a browser to eyeball the new Admin Dashboard changes.

**Only if demoing the phone-call path:**
4. ⚙️ Replace placeholder `TWILIO_PUBLIC_BASE_URL` with a real ngrok URL.
5. ⚙️ Point the Twilio Console webhook at that URL.
6. 🧪 Place one real test phone call end-to-end.

**Not required before presentation, but good to know and be ready to explain:**
7. 🟠 No real authentication/authorization anywhere.
8. 🟠 SLA breaches are detected but never actually notify anyone (no email/SMS/push).
9. 🟠 Citizen feedback ratings aren't sent to the backend.
10. 🟠 No rate limiting on any backend endpoint (including the paid Gemini call).
11. 🟠 File upload validation is extension-only, with no content-type check or size limit.
12. 🎭 The chatbot, and most of Admin/Officer/Call-Center's supporting screens (users, departments, audit logs, live calls, exceptions, notifications), are mock/demo data, not backend-driven.

**Low-priority cleanup, whenever convenient:**
13. 🗑️ Remove the dead `frontend-dev` entry from `.claude/launch.json`.
14. 🗑️ Remove the now-unused port-5173 CORS origins from `backend/app/main.py`.
15. 🗑️ Remove the unused `TWILIO_PHONE_NUMBER` property reference, `INITIAL_COMPLAINTS` mock data, `motion` npm dependency, and the leftover `_debug_*`/`_verify_tamil_fix.py` scratch files.
16. 🟡 Optional: code-split the govportal bundle, write a real README, consolidate run instructions, add a DB migration tool (Alembic), add frontend automated tests, add a fallback path for Gemini outages, add production deployment config (Docker/CI).
