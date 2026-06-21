# BUILD BRIEF — PreKick (AI Valley "Agents You Love" Hackathon)

> **How to use this doc:** This is the master build brief for Saturday. Frontend is already done in Lovable and synced with the backend — don't touch it unless explicitly noted. The build day's work is on the **memory layer** (HydraDB), the **memory-informed voice agent** (ElevenLabs), and the **continuity surfacing** in synthesis. Submission code: `MEMORY2026`. HydraDB credits code: `HYDRA2026`. Track: **Track 10 — Open Memory Track.**

---

## 1. What we are building (one paragraph)

PreKick is a pre-kickoff voice agent for professional-services onboarding. After a deal closes, our AI calls each stakeholder (sponsor, IT lead, project lead, finance) by phone, conducts a natural voice interview, and produces a cross-stakeholder conflict map showing where they silently disagree. **What makes PreKick a memory product:** every conversation with every stakeholder is persisted to HydraDB, and the next time PreKick calls that same person — even on a different project — it picks up the conversation. *"Hi Tom, last time we spoke the Salesforce integration was your biggest concern. Where does that stand now?"* That's an agent that remembers — at the human level, across sessions, autonomously.

This is an **8-hour hackathon build**, demo-focused, not production. Optimize for a working live demo over completeness.

---

## 2. The wedge (the thing that must come through)

Most agent demos suffer from amnesia — they forget everything between sessions. PreKick remembers, but specifically at the *stakeholder* level: every human PreKick has spoken to has a persistent record in HydraDB that grows with every conversation. Three things must be undeniable in the demo:

1. **The agent uses memory autonomously** — no human prompted it; before each call, it queries HydraDB and incorporates retrieved history into the live conversation.
2. **The memory visibly alters behavior** — the agent says different things on a return call than it would on a first call. Judges should hear this in the first 10 seconds.
3. **The memory is verifiable** — judges can see HydraDB read and write events in real time on screen, proving the agent wrote to and queried HydraDB autonomously (deliverable #3 in the official brief).

Everything else (the conflict map, the kickoff packet, the document auto-fill) is supporting infrastructure. The wedge is *stakeholder continuity*.

---

## 3. How this satisfies the official brief

The brief has three mandatory requirements. We satisfy each one explicitly:

| Brief requirement | How PreKick satisfies it |
|---|---|
| HydraDB as primary memory layer | Every stakeholder transcript, every interview, every conflict record is stored in HydraDB. All retrieval happens through HydraDB. |
| Autonomous recall of past interactions | Before every call, backend queries HydraDB for that stakeholder's history without human intervention. The agent decides what to reference. |
| Context-aware execution | The agent's spoken behavior on a return call is observably different from a first call. Conflict map synthesis includes "Continuing from last time" cards when history exists. |

We're submitting as **Track 10 — Open Memory Track.** The pitch framing: *"Every onboarding starts with amnesia. Stakeholders re-explain their concerns to every new tool, every new PM, every new project. PreKick is the agent that remembers — at the person level — so every conversation continues, instead of restarts."*

---

## 4. Current repo state (what you're starting from)

- **Frontend:** Lovable-built React frontend, already synced with the backend's API contract. Screens include: Project Setup, Stakeholders & Calls, Live Call view, Conflict Map (with "Continuing from last time" support), Stakeholder History view, Kickoff Packet, mock Rocketlane export modal.
- **Backend:** Existing Claude Code-built backend now responding to the new frontend's API calls. Handles SOW extraction, voice-call processing, conflict synthesis. Hosted on Vercel.
- **Voice:** ElevenLabs agent rebuilt in our account (not the old teammate's). System prompt configured. Webhook pointed at the deployed Vercel `call-webhook` route.
- **What's missing:** HydraDB is not yet integrated. No memory layer is live. Stakeholder history doesn't persist. Memory Log panel doesn't exist yet. The agent's system prompt doesn't yet accept dynamic prior-history injection.

**The build day's job is to add the memory layer on top of a working product.**

---

## 5. Stack & responsibilities

| Layer | Tool | Role |
|---|---|---|
| Memory (the wedge) | **HydraDB** | Stores per-stakeholder conversation history. Embedding-based retrieval before calls. Append-on-completion after calls. |
| Voice | **ElevenLabs Conversational AI** | Outbound calls; dynamic-variable injection of prior history; LLM = Gemini 2.5 Flash for in-call latency |
| Reasoning | **Claude (Anthropic API)** | SOW extraction, conflict synthesis (now memory-informed), continuity classification |
| Frontend | **Lovable (locked)** | Existing screens — do not modify except to add a Memory Log panel and dynamic data binding for the continuity cards |
| Backend | **Existing repo (Vercel-deployed)** | API routes for extraction, synthesis, call-webhook, plus new routes for stakeholder lookup, write, and Memory Log streaming |
| Reasoning compute | **Nebius** (light touch) | Hosts embeddings model for HydraDB writes; mentioned in architecture either way |
| PM-personal layer | **Thine** (mocked) | Personal coaching card on Stakeholder History view; UI-only for the demo |
| Deploy | **Vercel** | Public URL for ElevenLabs webhook and demo |
| Code generation | **Claude Code** | Backend work during build — extending the existing backend with HydraDB and the new endpoints |

---

## 6. Data model (extends the existing backend)

The current backend has a working schema for Deal Profile, calls, and conflict map. We're adding **one new primary entity** — `stakeholder` — and changing the conversation-storage relationship.

```
stakeholder
  id (uuid, primary key)
  name, role, email, phone, customer
  hydradb_record_id        # foreign key to HydraDB

stakeholder_interview      # the new record HydraDB persists
  stakeholder_id
  project_id               # which project this interview was part of
  date
  transcript               # full text
  extracted_concerns       # JSON list — concerns the agent identified
  embedding                # for similarity retrieval
  status_per_concern       # resolved | persisting | escalated | new

# Existing tables (unchanged):
deal_profile, stakeholder_call, generated_document, conflict_map, kickoff_packet
```

**The key shift:** memory is keyed on `stakeholder_id`, not `project_id`. We don't ask "show me past projects." We ask "show me past conversations with this person."

---

## 7. The four Claude/HydraDB operations to build

### (a) Stakeholder lookup — `GET /api/stakeholder-history`
Input: `{ name, customer, email }`. Output: array of all prior interviews for this stakeholder from HydraDB, with full transcripts and extracted concerns. If no prior history, return empty array. **Called automatically at project setup time, no user prompt required** (this is the "autonomous recall" requirement).

### (b) Memory-informed in-call questioning — `POST /api/next-question`
Same role as before, but now accepts `prior_history` as part of the input. Claude generates the next question with the prior history loaded into its context. The system prompt is now: *"Here is your prior conversation history with this stakeholder: [history]. Continue the conversation, referencing prior context naturally."*

### (c) Continuity-aware synthesis — `POST /api/conflict-map`
Loads all current transcripts AND each returning stakeholder's prior history. Claude produces:
- The conflict map (as before)
- A "continuing from last time" object per returning stakeholder with `prior_quote`, `current_quote`, `status` (resolved | persisting | escalated | new), and `notes`.

### (d) Memory write — `POST /api/stakeholder-interview` (called by call-webhook)
When ElevenLabs posts a completed call transcript, the webhook handler embeds the transcript, extracts concerns from it (via Claude), and writes a new `stakeholder_interview` record to HydraDB linked to the right `stakeholder`. **This is the "autonomous write" requirement — the agent persists what it learned without human intervention.**

---

## 8. The Memory Log panel (deliverable #3)

The official brief explicitly requires "execution logs proving the agent successfully wrote to and queried HydraDB autonomously." Build a small UI panel that addresses this:

- Lives at the bottom of every screen (collapsible footer strip, ~80px tall when open).
- Streams every HydraDB operation in real time: `[HYDRA READ] stakeholder=Tom Becker → 1 prior interview retrieved` / `[HYDRA WRITE] stakeholder=Tom Becker, interview_id=...`.
- Auto-scrolls. Timestamps each entry. Color-codes reads (blue) vs writes (green).
- During the demo, leave it open. Judges literally see memory operations happening as the agent works.

This is the single highest-leverage UI addition because it makes the memory claim *visible* and *verifiable* rather than something the user has to take on faith.

---

## 9. Scope for 8 hours — build vs. mock

**Build for real (non-negotiable for the demo):**
1. HydraDB integration with the four operations above
2. Memory Log panel streaming live HydraDB events
3. Pre-seeded "Tom Becker" stakeholder with one prior interview record in HydraDB before the demo starts
4. The ElevenLabs agent receiving dynamic prior-history variables and using them in the live call
5. Continuity-aware conflict map with at least one "Continuing from last time" card visible

**Acceptable to keep mocked:**
- Thine personal-coaching card (static placeholder on Stakeholder History view, mentioned in pitch)
- Nebius (use any embedding library for actual implementation; mention in architecture story)
- Multiple customers across the memory (one returning stakeholder is enough to demo)
- Rocketlane export (modal stays mocked as before)

---

## 10. Build order (8 hours — protect the wedge)

| Time | Focus | Milestone |
|---|---|---|
| **0:00–0:30** | Setup | All accounts logged in; HydraDB credits redeemed (`HYDRA2026`); team roles assigned; demo arc agreed |
| **0:30–1:30** | HydraDB integration | `stakeholder` table + lookup endpoint working; manual write test successful from backend |
| **1:30–2:30** | Pre-seed Tom's history | One complete prior interview transcript written to HydraDB linked to a Tom Becker stakeholder record. Verify lookup returns it. |
| **2:30–3:30** | Memory-informed voice agent | ElevenLabs dynamic variables receive `prior_history` from backend; live call references it. **Test once end-to-end here.** Go/no-go on live voice at 3:15. |
| **3:30–5:00** | Continuity synthesis | Conflict map endpoint extended to produce "Continuing from last time" cards. Frontend renders them. |
| **5:00–5:45** | Memory Log panel | Build the streaming HydraDB-events panel. Wire it everywhere. |
| **5:45–6:30** | Memory-write loop | Webhook handler writes new interview to HydraDB on call completion. Verify Tom's record now has 2 interviews after demo run. |
| **6:30–7:30** | End-to-end test + polish | Run the full demo three times. Fix friction points. Pre-record voice backup. Time the demo. |
| **7:30–8:00** | Final rehearsal + submission prep | Submit via portal with code `MEMORY2026`. Capture screenshots/video of Memory Log panel for execution-logs deliverable. |

**Discipline:** if anything slips, protect (a) the memory-informed live call and (b) the Memory Log panel. Those two together prove the brief's three requirements. Everything else is supporting.

---

## 11. Pre-seeded data (write before Saturday)

The demo lives or dies on one piece of seeded data: **Tom Becker's prior interview.** Write a complete realistic transcript before the event in which Tom (IT lead at Northwind Retail) raises three specific concerns:

1. Salesforce integration was "a nightmare" in a prior project
2. He was "frustrated" at not being consulted at scope time
3. He worried the timeline was unrealistic

The current demo project (Northwind, second engagement) will have Tom as a returning stakeholder. When the agent calls live during the demo, it opens with: *"Hi Tom, last time we spoke the Salesforce integration was the biggest concern — where does that stand now?"* The judge — playing Tom — responds however they want. The conflict map afterward shows Tom's continuity card: "Salesforce integration" concern persisting, status: ongoing.

**This single transcript is the most important asset of the build. Write it carefully. It must be specific enough that the agent's live reference is convincing.**

---

## 12. The demo (live, ~5 minutes)

**Open (~30 sec):** *"Every onboarding starts with amnesia. Stakeholders re-explain their concerns to every new tool, every new PM, every new project. PreKick is the agent that remembers — every conversation with every person, carried forward across every project."*

**Setup (~30 sec):** *"We're starting a new project today — Northwind Retail, a second engagement. One of the stakeholders, Tom Becker on IT, we've talked to before. Watch what happens."* Click into the Stakeholders screen. Show Tom's prior history visible. Memory Log panel shows the lookup happening: `[HYDRA READ] stakeholder=Tom Becker → 1 prior interview retrieved`.

**The live call (~2 minutes):** Hand a judge a phone. Agent dials. First sentence references Tom's prior concern. Judge improvises a response. Agent continues, memory-informed throughout.

**The conflict map (~90 sec):** End the call. Memory Log panel shows write: `[HYDRA WRITE] stakeholder=Tom Becker, interview_id=...`. Conflict map renders with Tom's "Continuing from last time" card visible. Show the verbatim prior quote next to the current one, with status flagged.

**Close (~30 sec):** *"Three things the brief asked for. HydraDB as primary memory — every interview lives there. Autonomous recall — the agent queried Tom's history without anyone prompting it. Context-aware execution — the agent's first sentence on the live call was different because of memory. PreKick is an agent that remembers people, not just data."*

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| HydraDB integration takes longer than expected | Two people read HydraDB docs before Saturday; lean hard on HydraDB sponsor support at the event |
| Live voice call doesn't actually reference prior history convincingly | Iterate the in-call system prompt against the pre-seeded Tom transcript in the Anthropic Workbench; bake the prior history into the opening line explicitly |
| Memory Log panel feels gimmicky / cluttered | Keep it minimalist — small text, color-coded, auto-collapsed unless needed. Open it explicitly during demo. |
| Judge asks "every project is unique — why memory?" | Answer rehearsed: *"Projects are unique. People aren't. We remember the people."* |
| Live call flakes on stage | Pre-record a backup call from the pre-seeded data; play it if live fails |
| New teammates not up to speed | They read the project plan and BUILD BRIEF before Saturday; brief them in the first 30 min |

---

## 14. Submission checklist

- [ ] **Working prototype:** live demo or recorded video showing the full memory-informed flow
- [ ] **Source code:** repo pushed to GitHub, with `README.md` referencing HydraDB integration
- [ ] **Execution logs:** Memory Log panel screenshots OR exported JSON traces of all HydraDB read/write operations during the demo run
- [ ] **(Optional) Pitch deck:** the architecture and workflow diagrams from `prekick-v2/` if time allows
- [ ] **Submit via portal:** code `MEMORY2026`
- [ ] **HydraDB credits:** code `HYDRA2026` redeemed in billing before the event

---

## 15. Glossary

- **Stakeholder continuity** — the wedge. Memory at the per-person level, carried across projects.
- **Memory Log panel** — the live UI panel showing HydraDB read/write events; satisfies brief deliverable #3.
- **Continuing from last time** — the synthesis output that surfaces returning-stakeholder history alongside current conflicts.
- **Returning stakeholder** — a person PreKick has interviewed at least once before.
- **Track 10** — Open Memory Track. Our submission track.
- **Autonomous recall** — the agent queries memory without a human prompting it. Mandatory per the brief.
- **Autonomous write** — the agent persists new interactions to memory without a human prompting it. Mandatory per the brief.

---

*Build the wedge first. When in doubt, protect the live call and the Memory Log panel. Track 10. Submission code MEMORY2026.*
