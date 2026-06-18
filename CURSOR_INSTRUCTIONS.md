# CURSOR / CLAUDE CODE INSTRUCTIONS — Pre-Kickoff Voice Agent (Backend + Integrations)

> **Read this whole file before writing code.** It's the full context and the build instructions for everything that isn't the frontend. The frontend was built in Lovable and exported to this repo; your job is the DB, backend, and the Anthropic + ElevenLabs integrations, then wiring them into the existing UI. This is a 5-hour hackathon build — optimize for a working live demo over completeness.

---

## 1. What we are building (context)

A **voice-first pre-kickoff agent** for professional-services (PS) onboarding. After a deal closes, onboarding is full of routine "information" calls where a human just gathers data. We put a **voice agent** on those calls: it interviews each stakeholder, turns each call into structured paperwork, and — because it's spoken to everyone — produces a **cross-stakeholder conflict map** of where stakeholders silently disagree (sponsor: "live in 6 weeks"; IT: "realistically Q2").

**The wedge (keep central):** every competitor, including Rocketlane's "Nitro" agent, processes *documents that already exist*. We generate *net-new context via outbound voice* and produce the conflict map no document tool can. Two things must work: (1) a voice call that becomes a document, (2) the conflict map. Everything else is supporting and can be mocked.

**Call triage (honest framing in any generated copy):** the agent takes **information calls** (intake, confirmation, scheduling, status); humans keep **judgment calls** (negotiation, relationship, trust). Never imply the agent replaces all calls.

---

## 2. Current repo state (from Lovable)

- React + Tailwind frontend, screens: Projects/Setup, Stakeholders & Calls, Conflict Map, Kickoff Packet, plus a mock "Send to Rocketlane" modal.
- All data is currently **hardcoded mock data in React state/constants**. Your job is to replace that mock data with real data from a backend where it matters (see Section 6 for what's real vs mocked).
- Keep the existing UI/layout; don't redesign. Swap mock constants for fetched data.

**First step:** get it running locally, confirm env/secrets, inspect where the mock constants live so you know what to replace.

---

## 3. Stack decisions (already made — follow these)

- **DB:** keep the **Supabase** Postgres Lovable provisioned. Don't re-roll a new DB. If Lovable didn't set one up, create a Supabase project and use it.
- **Backend:** Supabase edge functions (or Next.js API routes if the export is a Next app — match whatever Lovable produced). Backend functions hold all secrets and make the external API calls.
- **Reasoning:** Anthropic API via `@anthropic-ai/sdk`. Default model: a Sonnet-tier model for in-loop speed (use the current model string the human gives you).
- **Voice:** ElevenLabs Conversational AI.
- **Secrets (server-side only, never client):** `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, plus Supabase keys.

---

## 4. Data model (create these tables in Supabase)

```
deal_profile
  id (uuid, pk)
  customer        jsonb  -- {legalEntity, billingEntity, address, billingAddress, taxId, industry, sizeBand, region}
  commercial      jsonb  -- {totalValue, currency, paymentTerms, milestones[], poRequired, poNumber, termLength}
  scope           jsonb  -- {summary, deliverables[], exclusions[], startDate, goLiveDate, milestones[], dependencies[]}
  stakeholders    jsonb  -- [{id, name, email, role, phone}]  role ∈ sponsor|projectLead|it|finance|champion|procurement
  compliance      jsonb  -- {requiredDocs[], flaggedClauses[], dataResidency, securityLevel}
  meta            jsonb  -- {fieldConfidence{}, fieldSource{}, flaggedForReview[]}
  created_at

stakeholder_call
  id (uuid, pk)
  deal_profile_id (fk)
  stakeholder_id
  role
  status          text   -- scheduled|inProgress|completed|failed
  transcript      text
  extracted_data  jsonb
  generated_doc_id (nullable fk)
  created_at

generated_document
  id (uuid, pk)
  deal_profile_id (fk)
  type            text
  fields          jsonb
  fill_types      jsonb  -- per field: direct|derived|conditional|flaggedBlank
  flagged_blanks  jsonb
  created_at

conflict_map
  id (uuid, pk)
  deal_profile_id (fk)
  conflicts       jsonb  -- [{category, stakeholderA, quoteA, stakeholderB, quoteB, severity, suggestedResolution}]
                         -- category ∈ timeline|successCriteria|authority|assumption|political
  created_at

kickoff_packet
  id (uuid, pk)
  deal_profile_id (fk)
  executive_summary text
  stakeholder_map   jsonb
  success_reconciliation jsonb
  risk_register     jsonb
  hidden_landmines  jsonb
  agenda            jsonb
  questions_to_ask_live jsonb
  created_at
```

**Required-documents matrix** (compute `compliance.requiredDocs` from the profile):
- all → orderForm, billingSetup, kickoffTemplate
- sizeBand=enterprise → soc2Request, securityQuestionnaire
- any data processing → dpa
- region EU/EEA → gdprAddendum, dataResidencyConfirmation
- industry=healthcare → baa
- US → w9 ; non-US → w8

**Four fill types:** direct (copied), derived (computed e.g. termLength from dates), conditional (only if condition holds), flaggedBlank (cannot confidently fill → flag for human review, never guess).

---

## 5. The three Claude calls (the intelligence — build as backend functions)

### (a) SOW → Deal Profile  [endpoint: POST /extract-profile]
- Input: `{ sowText }`.
- Call Claude with a system prompt instructing strict-JSON output matching the `deal_profile` shape, with a confidence (high/medium/low) and source per field, and a `flaggedForReview` array for anything uncertain.
- Parse, strip any code fences, validate JSON, insert a `deal_profile` row, return it.
- Also compute `requiredDocs` via the matrix server-side after extraction.

### (b) In-call dynamic questioning  [endpoint: POST /next-question]
- Input: `{ role, conversationSoFar }`.
- Call Claude to produce the single next question, adapting to prior answers (NOT a fixed script). Role-tuned banks:
  - sponsor: business outcome, board visibility, what failure costs them, politics, budget reality
  - projectLead: real capacity, competing priorities, team morale, prior tool fatigue
  - it: integration reality, security timeline, sandbox access, change windows, sign-off authority
  - champion: workflow pain, what they've tried, adoption fears, training, holdouts
- Return `{ question }`.

### (c) Cross-transcript conflict synthesis  [endpoint: POST /conflict-map]  ← CRITICAL
- Input: `{ dealProfileId }` → load all completed transcripts for that profile.
- Call Claude to output strict-JSON `conflicts[]` matching the `conflict_map` shape. Requirements:
  - Each conflict must include BOTH opposing quotes verbatim, attributed to stakeholder name + role.
  - A `severity` (high/medium/low) and a one-line `suggestedResolution` for the kickoff agenda.
  - Categories: timeline, successCriteria, authority, assumption, political.
  - Surface SPECIFIC contradictions, not generic observations. If two stakeholders give incompatible dates, that's a timeline conflict with both dates quoted.
- Insert a `conflict_map` row, return it.

> **This (c) prompt is the single most important component. Its output quality is the difference between a winning demo and a forgettable one.** Build it so the prompt can be iterated in isolation against the two seeded transcripts (Section 7) without touching anything else. Spend disproportionate time here.

### Also: post-call document generation  [endpoint: POST /generate-doc]
- Input: `{ callId }` → load transcript → Claude extracts a structured "Requirements Summary" (or billing-setup sheet) → insert `generated_document`, link to the call, return it. This powers the "a call becomes a document" demo moment.

### Also: kickoff packet  [endpoint: POST /kickoff-packet]
- Input: `{ dealProfileId }` → synthesize the packet (exec summary, stakeholder map, risk register from conflicts, hidden landmines, agenda) → insert `kickoff_packet`, return it.

---

## 6. What is REAL vs MOCKED (respect this — don't over-build)

**REAL (must run on live/real data):**
- SOW → Deal Profile extraction (endpoint a)
- At least one live voice call OR a pre-recorded fallback through the same pipeline
- One call → one generated document (generate-doc)
- Conflict map synthesis across ≥2 transcripts (endpoint c)

**MOCKED (leave as frontend mock, do NOT build backend):**
- Full document auto-fill across the entire matrix — show ONE filled doc + the matrix chips firing; don't build all doc types
- Compliance routing / signature chasing — UI "sent" states only
- Rocketlane/Nitro export — the mock modal already in the frontend stays mock

---

## 7. Seed data (insert before testing the conflict map)

Insert one `deal_profile`: **Northwind Retail GmbH**, billing entity Northwind Retail Holdings, Munich/Germany (EU), Retail, **Enterprise** (so matrix → GDPR + DPA + SOC2), $240k EUR, Net 30, start 2026-07-01, go-live 2026-09-15. Stakeholders: Anya Müller (sponsor), Tom Becker (it), Priya Shah (projectLead), Daniel Roth (finance).

Insert two completed `stakeholder_call` rows with transcripts **engineered to conflict** — the conflict-map prompt must reliably catch these:
- **Anya Müller (sponsor)** transcript expresses: must be live in ~6 weeks; thinks the Salesforce integration is simple; success = adoption across all regions by Q3.
- **Tom Becker (it)** transcript expresses: realistically Q2, integration alone is 8+ weeks; the Salesforce API was a nightmare last time and is the biggest risk; capacity to pilot one region only.

These produce 3 conflicts: timeline (6 weeks vs Q2), assumption (integration simple vs nightmare), success criteria (all regions vs one-region pilot). If the human wants, ask me (the planning assistant) to generate the full transcript text.

---

## 8. Build order (Cursor phase — protect the wedge)

1. Get repo running locally, wire secrets, confirm Supabase connection, inspect frontend mock constants. ~30 min.
2. Create tables + insert seed data (Section 7). ~20 min.
3. **SOW → Deal Profile** endpoint + wire it into Screen 1 (replace mock with real extraction). ~40 min.
4. **Conflict map** endpoint + wire into Screen 3, tested against the seeded transcripts. **Build this BEFORE voice** — it's the differentiator and must work even if voice slips. ~55 min.
5. **generate-doc** endpoint (call → document). ~25 min.
6. **Voice (ElevenLabs):** one sponsor call end-to-end → store transcript → trigger generate-doc live. **Go/no-go at ~3:30**; if shaky, fall back to pre-recorded audio + stored transcript through the same pipeline. ~60 min.
7. Kickoff packet endpoint (or leave mocked if short on time). ~20 min.
8. Polish + demo rehearsal. ~30 min.

**If time slips: protect #4 (conflict map) and #6 (voice). Mock the rest.**

---

## 9. The demo this must support (build toward this exact flow)

1. Hand a judge a phone → agent calls them as "sponsor" → 90-sec info call → a document generates live from what they said.
2. Show a second stakeholder (pre-recorded IT lead) was interviewed → generate the conflict map on stage → it surfaces a REAL contradiction between the judge's answers and the IT lead's (timeline clash = cleanest).
3. Drop the SOW → Deal Profile populates → one auto-filled doc → consistency check catches a planted mismatch → mock Rocketlane export.

UI reinforces the closing line: *"The agent takes the calls that don't need a human, writes the paperwork, and tells you where your stakeholders disagree — before kickoff."*

---

## 10. Glossary (so further prompts are unambiguous)

- **Deal Profile** — structured record extracted from the SOW; single source of truth.
- **Information vs judgment call** — agent takes the former, humans keep the latter.
- **Conflict map** — signature artifact; cross-stakeholder contradiction detection.
- **Kickoff packet** — synthesized pre-kickoff brief for the PM.
- **The engine** — document/auto-fill layer (supporting; overlaps with Nitro on purpose).
- **The wedge** — voice-generated net-new context + the conflict map.
- **Nitro** — Rocketlane's existing agent that turns documents into plans; we feed it, not compete.

---

*Build the wedge first. Conflict map before voice. When in doubt, protect the live call and the conflict map.*
