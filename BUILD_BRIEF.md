# BUILD BRIEF — Pre-Kickoff Voice Agent (Lovable + Cursor hybrid build)

> **How to use this doc:** This is a **hybrid build**. Build the frontend in **Lovable** first (it's prompt-driven — describe screens and it builds them), export to GitHub early, then do the **DB, backend, and integrations in Cursor / Claude Code**. Keep this whole file as shared context so any further prompt makes sense.
>
> **Tool split:** **Lovable** = frontend/UI only · **Cursor/Claude Code** = DB + backend + the Anthropic and ElevenLabs integrations · **Supabase** = DB (keep what Lovable sets up) · **ElevenLabs** = voice · **Claude/Anthropic** = reasoning · **Rocketlane/Nitro** = mocked destination. We deliberately use all the sponsor tools.
>
> **Order (do not reverse):** Lovable frontend → export to GitHub early → Cursor for everything else. Lovable scaffolds the whole project skeleton; let it lay that foundation, export once, then Cursor becomes the single source of truth. Going backend-first and importing the frontend later means merging Lovable's full scaffold into yours — avoid it.

---

## 1. What we are building (one paragraph)

A **voice-first pre-kickoff agent** for professional-services (PS) onboarding. When a deal closes, there's a weeks-long onboarding process full of calls where a human is just acting as a microphone — gathering requirements, collecting billing/legal details, confirming scope, scheduling. Our product puts a **voice agent** on those calls: it interviews each stakeholder by phone, turns each call into structured paperwork automatically, and — because it's the only entity that has spoken to *everyone* — produces a **cross-stakeholder conflict map** showing where stakeholders silently disagree (sponsor says "live in 6 weeks," IT says "realistically Q2"). A document layer underneath reads the signed SOW to drive the whole thing and auto-fill onboarding documents.

This is a **hackathon build (5 hours, demo-focused)**, not production. Optimize for a working live demo over completeness.

---

## 2. The wedge (must come through in the build)

Every competitor (including Rocketlane's own agent "Nitro") works on **documents that already exist**. **We generate net-new context by talking to people via outbound voice, and produce the one artifact no document tool can: the conflict map.** The build must make two things central:

1. **Voice is the MVP** — a live call that becomes a document on screen.
2. **The conflict map is the signature artifact** — cross-stakeholder contradiction detection, rendered visually, conflicts in red.

Document auto-fill / billing is a *supporting engine*, not the headline. Don't over-invest there.

---

## 3. Context

- **Event:** Rocketlane PS/Onboarding/Implementation hackathon. No-code. 5-hour build.
- **Sponsor tools (use all three):** **Lovable** (build), **ElevenLabs** (voice — this is the wedge, lean in), **Claude/Anthropic** (reasoning). Rocketlane/Nitro is the conceptual destination (mocked).
- **Framing toward Rocketlane:** complementary to Nitro, **not** competitive. Nitro turns documents into plans; we turn *conversations* into the human context that makes those plans correct, then hand off. Our output is structured data that could feed a Rocketlane-style project (we mock the export).
- **Call triage (core domain insight — keep honest in all UI copy):** onboarding has **judgment calls** (negotiation, relationship, trust — humans keep these) and **information calls** (intake, confirmation, data-gathering, scheduling, status — the agent takes these). Never imply the agent replaces *all* calls.

---

## 4. Tech stack & the hybrid flow

**Frontend (Lovable):** React + Tailwind, built in Lovable from prompts. Build the screens in Section 7 as UI only — wire nothing to ElevenLabs or Claude here. When the shell looks right, **export to GitHub early** (before over-polishing — every post-export change in Lovable must be hand-reconciled in Cursor).

**DB + backend + integrations (Cursor / Claude Code):** pull the exported repo and do everything else here.
- **DB:** keep the **Supabase** Postgres that Lovable provisions (faster than re-rolling your own — it's already set up). Only swap to Next.js API routes + Prisma + SQLite if you have a specific reason.
- **Reasoning:** Anthropic API (`@anthropic-ai/sdk`) for the three Claude calls, from backend functions / Supabase edge functions.
- **Voice:** ElevenLabs Conversational AI, wired from a backend function that connects the agent, stores the transcript, and triggers post-call processing.
- **Secrets:** `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` in env, never client-side.

**Budget the handoff:** the Lovable→Cursor export/setup (repo, local run, env vars) costs ~15–30 min. Worth it for control over the integrations, but it's real time in a 5-hour window — don't treat it as free.

**Inside the Cursor phase, do reasoning before voice.** Build the Anthropic extraction + conflict-map work *first* against seeded transcripts, then the ElevenLabs voice wiring. Voice is the riskiest integration and the conflict map is what wins — so get the winning artifact working before you touch the risky part.

> **Known risk:** the ElevenLabs voice wiring is the hardest piece. If it fights the time box, fall back to **pre-recorded audio + a stored transcript** that flows through the *same* post-call pipeline. The conflict map and document generation run on the transcript regardless, so the demo is fully covered either way.

---

## 5. Data model (build in Supabase, in the Cursor phase)

Single source of truth is the **Deal Profile**; everything reads from it.

```
DealProfile
  id
  customer: legalEntity, billingEntity, address, billingAddress,
            taxId, industry, sizeBand, region
  commercial: totalValue, currency, paymentTerms, milestones[],
              poRequired, poNumber, termLength (derived)
  scope: summary, deliverables[], exclusions[], startDate,
         goLiveDate, milestones[], dependencies[]
  stakeholders: [ {name, email, role, phone} ]   # WHO the agent calls
                # role ∈ sponsor|projectLead|it|finance|champion|procurement
  compliance: requiredDocs[], flaggedClauses[], dataResidency, securityLevel
  meta: fieldConfidence{}, fieldSource{}, flaggedForReview[]

StakeholderCall
  id, dealProfileId, stakeholderId, role
  status: scheduled|inProgress|completed|failed
  transcript, extractedData(json), generatedDocId(nullable)

GeneratedDocument
  id, dealProfileId, type, fields{}, fillTypes{}, flaggedBlanks[]

ConflictMap
  id, dealProfileId
  conflicts: [ {category, stakeholderA, quoteA, stakeholderB, quoteB,
                severity, suggestedResolution} ]
                # category ∈ timeline|successCriteria|authority|assumption|political

KickoffPacket
  id, dealProfileId, executiveSummary, stakeholderMap,
  successReconciliation, riskRegister[], hiddenLandmines[],
  agenda[], questionsToAskLive[]
```

**Required-documents matrix (conditional logic for `requiredDocs`):**
- all → orderForm, billingSetup, kickoffTemplate
- enterprise → soc2Request, securityQuestionnaire
- any data processing → dpa
- region EU/EEA → gdprAddendum, dataResidencyConfirmation
- healthcare → baa
- US → w9 ; non-US → w8

**Four fill types:** `direct` (copied), `derived` (computed, e.g. termLength from dates), `conditional` (only if condition holds), `flaggedBlank` (cannot confidently fill → human review, never guess).

---

## 6. The three Claude calls (the intelligence)

Call the Anthropic API from Lovable backend functions. Default to a Sonnet-tier model for in-loop speed/cost.

**(a) SOW → Deal Profile.** Input: SOW text. Output: strict DealProfile JSON (no prose), with confidence + source per field and a `flaggedForReview` list.

**(b) In-call dynamic questioning.** Runs mid-conversation. Input: role + conversation-so-far → next question. NOT a script — adapts to answers. Role banks: sponsor (outcome, board visibility, cost of failure, politics), projectLead (real capacity, competing priorities, tool fatigue), it (integration reality, security timeline, sandbox, sign-off), champion (workflow pain, adoption fears, holdouts).

**(c) Cross-transcript conflict synthesis — THE CRITICAL ONE.** Input: all transcripts → ConflictMap JSON. Must surface *specific* contradictions with both verbatim quotes, severity, and a one-line resolution. This prompt's quality is the difference between "oh" and "so what." Make it iterable in isolation against a fixed pair of sample transcripts.

---

## 7. Screens to build

1. **Project setup** — upload/paste SOW → extraction → Deal Profile populates with confidence indicators + flagged fields.
2. **Stakeholders & calls** — extracted stakeholder list; per-stakeholder call status; "call now" / "simulate call" action.
3. **Live call view** — in-progress transcript; on completion, the auto-generated document for that call.
4. **Conflict map** — the centerpiece. Visual, conflicts in red, each with the two opposing quotes + suggested resolution.
5. **Kickoff packet** — executive summary, stakeholder map, success reconciliation, risk register, hidden landmines, agenda; collapsible transcripts.
6. **Mock export bar** — "Send to Rocketlane" → mocked populated-project preview.

Design note: keep it clean and minimal; the conflict map is the visual hero — give it room and make the red contradictions pop.

---

## 8. Build order (5 hours — protect the wedge)

**Phase A — Lovable (frontend shell):**
1. Build the screens in Section 7 as UI with placeholder/dummy data. Clean, minimal; conflict map is the visual hero. ~45 min.
2. **Export to GitHub.** Stop editing in Lovable after this. ~15 min (part of the handoff budget).

**Phase B — Cursor / Claude Code (everything else):**
3. Pull repo, get it running locally, wire env vars/secrets, confirm the Supabase DB + seed dummy data (DealProfile + 2 stakeholders). ~30 min.
4. **SOW → Deal Profile extraction** against a real sample SOW. ~40 min.
5. **Conflict map synthesis** across two seeded conflicting transcripts; render it. ~55 min. *(Most important — protect this. Build it before voice so the winning artifact works even if voice slips.)*
6. **Voice call (the wedge):** one ElevenLabs sponsor call end-to-end; store transcript; **generate one document from that call live.** Go/no-go on live voice at ~3:30; lock pre-recorded fallback if shaky. ~60 min.
7. **Mock layer + polish:** stub doc auto-fill, mock Rocketlane export, tidy UI. ~20 min.
8. **Demo rehearsal.** ~25 min.

**If time slips: protect #5 (conflict map) and #6 (live call), mock everything else.** Note the deliberate reorder vs. a normal build — conflict map comes *before* voice in the Cursor phase, because it's the differentiator and voice is the risk.

---

## 9. Real vs mocked

**Real:** SOW→Deal Profile extraction · ≥1 live voice call (or pre-recorded fallback through the same pipeline) · one call→one document · conflict map across ≥2 transcripts.

**Mocked (UI only):** full document auto-fill matrix (show ONE filled doc + matrix firing) · compliance routing / signature chasing (show "sent" states) · Rocketlane/Nitro export (populated-project preview).

---

## 10. The demo this must support

1. Judge holds a phone → agent calls them as "sponsor" → 90-sec info call → a document generates live from what they said.
2. Second stakeholder (pre-recorded IT lead) was interviewed → generate conflict map on stage → surfaces a REAL contradiction between judge's answers and IT lead's (timeline clash = cleanest planted conflict).
3. Drop SOW → Deal Profile populates, one auto-filled doc, consistency check catches a planted mismatch → mock Rocketlane export.

Closing line the UI reinforces: *"The agent takes the calls that don't need a human, writes the paperwork, and tells you where your stakeholders disagree — before kickoff."*

---

## 11. Dummy data to seed

- One sample customer: **EU-based + enterprise** (so the matrix triggers GDPR + DPA + SOC2 — makes conditional fills visible).
- A sample SOW (clean, realistic) for the extraction demo.
- Two stakeholder transcripts authored to **conflict on timeline** (sponsor ~6 weeks; IT ~Q2) and on one scope assumption (sponsor: "Salesforce integration is simple"; IT: skeptical). The conflict-map prompt must reliably catch both.

---

## 12. Glossary

- **Deal Profile** — structured record from the SOW; single source of truth.
- **Information vs judgment call** — agent takes the former, humans keep the latter.
- **Conflict map** — signature artifact; cross-stakeholder contradiction detection.
- **Kickoff packet** — synthesized pre-kickoff brief for the PM.
- **The engine** — document/auto-fill layer (supporting; overlaps with Nitro on purpose).
- **The wedge** — voice-generated net-new context + the conflict map.
- **Nitro** — Rocketlane's existing agent that turns documents into plans; we feed it, not compete.

---

*End of brief. Build the wedge first. When in doubt, protect the live call and the conflict map.*
