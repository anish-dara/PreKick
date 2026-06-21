# HydraDB Memory Build — Implementation Brief for Cursor / Claude Code

> **You are an AI coding agent.** This document is a complete, self-contained spec. Implement it end-to-end. Everything you need (file paths, code snippets, prompts, seed data) is here. Where a snippet is given, prefer it verbatim — the SDK surfaces below have been verified against HydraDB v2 and the current ElevenLabs agent platform.
>
> **Hackathon:** AI Valley "Agents You Love" — Track 10 (Open Memory). Submission code `MEMORY2026`. HydraDB credits code `HYDRA2026` (redeem in billing at dashboard.hydradb.com before building).
>
> **The one-sentence goal:** Add a HydraDB-backed memory layer so the voice agent remembers each *person* across projects — it recalls a stakeholder's prior interview before calling them, references it live, and writes the new interview back, all autonomously, with every read/write visible on screen.

---

## 0. Context & ground rules

### What already exists (do not rebuild)
The app lives in [`Guiding Hand/`](Guiding%20Hand/). It is a working product; you are adding a memory layer on top.

- **Frontend** — React + Vite + TypeScript + Tailwind + shadcn, built in Lovable. **Locked.** Only two additions are allowed (see §4): the Memory Log panel and the continuity cards.
  - `src/components/AppLayout.tsx` — sidebar + top bar + `<Outlet/>`; wraps every authenticated screen. The Memory Log panel goes here.
  - `src/pages/Stakeholders.tsx` — stakeholder table + live-call sheet. Already renders `<elevenlabs-convai>` with a `dynamic-variables` JSON attribute.
  - `src/pages/ConflictMap.tsx` — conflict cards. The "Continuing from last time" cards go here.
  - `src/lib/api.ts` — `apiGet` / `apiPost` helpers. `src/lib/types.ts` — frontend row types (mirror `server/types.ts`).
  - `src/hooks/useStakeholderCalls.ts`, `useDealProfiles.ts` — react-query data hooks.
- **Backend** — small TypeScript/Express server in `server/`, run with `tsx`. State is held in memory and re-seeded from `data/northwind.json` on every boot.
  - `server/index.ts` — all routes (extract-profile, next-question, conflict-map, generate-doc, kickoff-packet, start-call, call-webhook).
  - `server/store.ts` — in-memory `Store` class.
  - `server/types.ts` — shared types.
  - `server/anthropic.ts` — `claudeJSON<T>()` helper (`claude-sonnet-4-6`, JSON-schema-constrained outputs).
  - `server/matrix.ts` — required-docs matrix.
  - `data/northwind.json` — seed data (Northwind deal profile, Anya + Tom completed transcripts, Priya + Daniel scheduled, empty conflict map).
- **Reasoning** — Anthropic API, server-side only, via `claudeJSON`.
- **Voice** — ElevenLabs Conversational AI via the `<elevenlabs-convai>` browser widget + a post-call webhook handled by `server/index.ts` at `/api/call-webhook`. The agent itself is configured in the ElevenLabs dashboard (see §3) — most of the "agentic workflow" lives there, not in our code.

### Run / dev commands (from `Guiding Hand/`)
```sh
npm install
npm run dev          # Vite frontend on :8080 + Express API on :8787 (Vite proxies /api -> :8787)
```
`.env` (server-side only, never prefixed `VITE_`) currently holds `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`. You will add `HYDRA_DB_API_KEY`.

### Hard rules (read before writing any code)
1. **HydraDB is the primary memory layer.** All persistent per-stakeholder interview history is read from and written to HydraDB. This is mandatory for the hackathon.
2. **Memory is keyed on the person, not the project.** We do not ask "show me past projects"; we ask "show me past conversations with *this human*." In HydraDB terms: one **`tenant_id`** for the app, **`sub_tenant_id` = a stable per-stakeholder key**.
3. **Scope: memory layer only.** The existing in-memory `store.ts` keeps owning transient deal profiles, calls, conflict maps, and packets. Do **not** move those into HydraDB. HydraDB owns exactly one thing: the durable `stakeholder_interview` records.
4. **Two autonomous behaviors must be demonstrable and visible:**
   - *Autonomous recall* — before a call, the backend queries HydraDB for that person's history with no human prompt.
   - *Autonomous write* — after a call, the post-call webhook writes the new interview to HydraDB with no human prompt.
   - Both must stream to the on-screen **Memory Log panel** (the execution-logs deliverable).
5. **Stays mocked** (do not build): Thine personal-coaching card, Nebius, Rocketlane export modal. Leave them as-is.

---

## 1. HydraDB setup (this is "create the db")

### 1.1 Install + env
From `Guiding Hand/`:
```sh
npm install @hydradb/sdk@^2
```
Add to `.env` and `.env.example`:
```
# HydraDB — memory layer (server-side only)
HYDRA_DB_API_KEY=
# Optional overrides (sensible defaults baked into server/hydra.ts)
# HYDRA_TENANT_ID=prekick
```

### 1.2 Memory data model (the design decision — document it in code comments)
| HydraDB concept | We use it for | Value |
|---|---|---|
| `tenant_id` | the whole PreKick app | `"prekick"` (from `HYDRA_TENANT_ID`, default `"prekick"`) |
| `sub_tenant_id` | **the person** (the wedge) | `stakeholderKey(name, email)` → stable slug, e.g. `tom-becker` |
| memory record (`type: "memory"`) | one completed `stakeholder_interview` | `text` = transcript + extracted concerns; `metadata` = `{ projectId, customer, role, date }` |
| `client.query({ type: "memory" })` | autonomous recall | retrieves prior interviews for a person |

`stakeholderKey` must be deterministic so the same human always maps to the same `sub_tenant_id` across projects. Prefer email when present, else name:
```ts
export function stakeholderKey(name: string, email?: string | null): string {
  const basis = (email && email.trim()) ? email.split("@")[0] : name;
  return basis.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
```

### 1.3 Create `server/hydra.ts`
This file owns: the client singleton, one-time tenant provisioning, the read/write helpers, and the Memory Log event emitter (so every HydraDB op is observable).

```ts
// server/hydra.ts
import { HydraDBClient } from "@hydradb/sdk";
import { EventEmitter } from "node:events";

const TENANT_ID = process.env.HYDRA_TENANT_ID ?? "prekick";

// ---- Memory Log event bus (consumed by the SSE route in index.ts) -----------
export type MemoryLogEvent = {
  ts: string;                       // ISO timestamp
  op: "READ" | "WRITE" | "INFO";
  stakeholder?: string;             // display name
  subTenantId?: string;
  detail: string;                   // human-readable line shown in the panel
};
export const memoryLog = new EventEmitter();
const RING: MemoryLogEvent[] = [];  // small backlog so a late-opening panel still shows recent ops
export function recentMemoryLog(): MemoryLogEvent[] {
  return RING.slice(-50);
}
export function logMemory(e: Omit<MemoryLogEvent, "ts">) {
  const evt: MemoryLogEvent = { ...e, ts: new Date().toISOString() };
  RING.push(evt);
  if (RING.length > 200) RING.shift();
  memoryLog.emit("event", evt);
  // also echo to stdout so it shows up in execution logs / terminal traces
  console.log(`[HYDRA ${evt.op}] ${evt.detail}`);
}

// ---- Client singleton -------------------------------------------------------
let client: HydraDBClient | null = null;
function getClient(): HydraDBClient {
  if (!client) {
    if (!process.env.HYDRA_DB_API_KEY) {
      throw new Error("HYDRA_DB_API_KEY is not set — add it to .env");
    }
    client = new HydraDBClient({ token: process.env.HYDRA_DB_API_KEY });
  }
  return client;
}

export function stakeholderKey(name: string, email?: string | null): string {
  const basis = (email && email.trim()) ? email.split("@")[0] : name;
  return basis.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ---- One-time tenant provisioning -------------------------------------------
let tenantReady: Promise<void> | null = null;
export function ensureTenant(): Promise<void> {
  if (!tenantReady) tenantReady = provision();
  return tenantReady;
}
async function provision(): Promise<void> {
  const c = getClient();
  try {
    await c.tenants.create({ tenantId: TENANT_ID });
  } catch (err) {
    // Tenant already exists is fine; rethrow anything else.
    const code = (err as { body?: { error?: { code?: string } } })?.body?.error?.code;
    if (code && code !== "TENANT_ALREADY_EXISTS" && code !== "CONFLICT") {
      // don't hard-fail boot — log and continue; status poll below will confirm readiness
      console.warn("HydraDB tenants.create warning:", code);
    }
  }
  // Poll until the tenant can accept ingestion.
  for (let i = 0; i < 60; i++) {
    const { data } = await c.tenants.status({ tenantId: TENANT_ID });
    if (data?.infra?.readyForIngestion) {
      logMemory({ op: "INFO", detail: `HydraDB tenant "${TENANT_ID}" ready for ingestion` });
      return;
    }
    await sleep(5_000);
  }
  throw new Error("HydraDB tenant did not become ready in time");
}

// ---- Write one interview (autonomous write) ---------------------------------
export type InterviewWrite = {
  name: string;
  email?: string | null;
  role: string;
  projectId: string;
  customer: string;
  transcript: string;
  concerns: string[];      // Claude-extracted concerns
  date?: string;           // ISO; defaults to now
};
export async function writeInterview(w: InterviewWrite): Promise<{ id: string; subTenantId: string }> {
  await ensureTenant();
  const c = getClient();
  const subTenantId = stakeholderKey(w.name, w.email);
  const date = w.date ?? new Date().toISOString();
  const text = [
    `Stakeholder: ${w.name} (${w.role}) at ${w.customer}`,
    `Project: ${w.projectId}`,
    `Date: ${date}`,
    `Concerns: ${w.concerns.join("; ") || "(none extracted)"}`,
    ``,
    `Transcript:`,
    w.transcript,
  ].join("\n");

  const res = await c.context.ingest({
    type: "memory",
    tenantId: TENANT_ID,
    subTenantId,
    memories: JSON.stringify([
      {
        text,
        infer: false, // store verbatim; we already extracted concerns ourselves
        user_name: w.name,
        metadata: { projectId: w.projectId, role: w.role },
        additional_metadata: { customer: w.customer, date, concerns: w.concerns },
      },
    ]),
  });

  const id: string = res.data.results[0].id;
  logMemory({
    op: "WRITE",
    stakeholder: w.name,
    subTenantId,
    detail: `stakeholder=${w.name}, interview_id=${id}, concerns=${w.concerns.length}`,
  });
  // best-effort: wait for indexing so an immediate read finds it (don't block forever)
  pollIndexed(id).catch(() => {});
  return { id, subTenantId };
}

// ---- Read a person's prior history (autonomous recall) ----------------------
export type PriorInterview = {
  text: string;
  metadata?: Record<string, unknown>;
};
export async function lookupHistory(opts: {
  name: string;
  email?: string | null;
  query?: string;
}): Promise<PriorInterview[]> {
  await ensureTenant();
  const c = getClient();
  const subTenantId = stakeholderKey(opts.name, opts.email);
  let chunks: PriorInterview[] = [];
  try {
    const res = await c.query({
      tenantId: TENANT_ID,
      subTenantId,
      type: "memory",
      query: opts.query ?? `Prior conversation history and concerns for ${opts.name}`,
      mode: "thinking",
      recencyBias: 0.6,
    });
    chunks = (res.data?.chunks ?? []) as PriorInterview[];
  } catch (err) {
    // No prior memory / brand-new person is a normal case — return empty, still log the read.
    chunks = [];
  }
  logMemory({
    op: "READ",
    stakeholder: opts.name,
    subTenantId,
    detail: `stakeholder=${opts.name} → ${chunks.length} prior interview${chunks.length === 1 ? "" : "s"} retrieved`,
  });
  return chunks;
}

// ---- helpers ----------------------------------------------------------------
async function pollIndexed(id: string): Promise<void> {
  const c = getClient();
  for (let i = 0; i < 30; i++) {
    const status = (await c.context.status({ tenantId: TENANT_ID, ids: [id] })).data.statuses[0];
    if (status.indexingStatus === "completed" || status.indexingStatus === "graph_creation") return;
    if (status.indexingStatus === "errored") throw new Error(status.errorMessage ?? "indexing errored");
    await sleep(2_000);
  }
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
```

> **SDK note (verified, v2):** the TypeScript SDK is `@hydradb/sdk`, default export class `HydraDBClient`, constructed with `{ token }`. Methods: `tenants.create({ tenantId })`, `tenants.status({ tenantId })` → `data.infra.readyForIngestion`; `context.ingest({ type, tenantId, subTenantId, memories })` where `memories` is a JSON-stringified array of `{ text, infer, metadata, additional_metadata }`, returns `data.results[i].id`; `context.status({ tenantId, ids })` → `data.statuses[i].indexingStatus`; `client.query({ tenantId, subTenantId, type, query, mode, recencyBias })` → `data.chunks`. All responses are wrapped in `{ success, data, error, meta }`; read from `.data`. If a method name differs in the installed version, check `node_modules/@hydradb/sdk` types — keep the call shapes identical.

### 1.4 Format prior history for the agent / synthesis
Add a small helper used by both `/api/start-call` and `/api/conflict-map`:
```ts
// server/hydra.ts (append)
export function formatPriorHistory(chunks: PriorInterview[]): string {
  if (!chunks.length) return "";
  return chunks
    .map((ch, i) => `Prior interview ${i + 1}:\n${ch.text}`)
    .join("\n\n---\n\n");
}
```

---

## 2. Backend endpoints (extend `server/index.ts`)

Import the helpers at the top of `server/index.ts`:
```ts
import {
  ensureTenant, lookupHistory, writeInterview, formatPriorHistory,
  stakeholderKey, memoryLog, recentMemoryLog, logMemory,
} from "./hydra.ts";
```
Call `ensureTenant().catch(console.error)` once on boot (inside or just before `app.listen`) so the tenant provisions in the background.

### 2.1 `GET /api/stakeholder-history` — autonomous recall (standalone)
Lets the frontend show prior history and proves the read. Query params: `name`, `email?`.
```ts
app.get(
  "/api/stakeholder-history",
  asyncHandler(async (req, res) => {
    const name = String(req.query.name ?? "");
    const email = req.query.email ? String(req.query.email) : null;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const chunks = await lookupHistory({ name, email });
    res.json({
      subTenantId: stakeholderKey(name, email),
      count: chunks.length,
      interviews: chunks,
    });
  }),
);
```

### 2.2 `POST /api/stakeholder-interview` — autonomous write
Embeds a completed transcript into HydraDB. Extract concerns with Claude first (reuse `claudeJSON`). Body: `{ name, email?, role, projectId, customer, transcript, date? }`.
```ts
const CONCERNS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["concerns"],
  properties: { concerns: { type: "array", items: { type: "string" } } },
};
const CONCERNS_SYSTEM = `You read one stakeholder call transcript and list the specific, concrete concerns or
risks the stakeholder raised — each as a short noun phrase (e.g. "Salesforce integration complexity",
"unrealistic timeline", "not consulted at scope time"). Only list things actually stated. Return an empty
array if none.`;

async function extractConcerns(transcript: string): Promise<string[]> {
  const out = await claudeJSON<{ concerns: string[] }>({
    system: CONCERNS_SYSTEM,
    user: `Transcript:\n${transcript}`,
    schema: CONCERNS_SCHEMA,
    effort: "low",
    maxTokens: 512,
  });
  return out.concerns ?? [];
}

app.post(
  "/api/stakeholder-interview",
  asyncHandler(async (req, res) => {
    const { name, email, role, projectId, customer, transcript, date } = req.body ?? {};
    if (!name || !transcript) {
      res.status(400).json({ error: "name and transcript are required" });
      return;
    }
    const concerns = await extractConcerns(transcript);
    const result = await writeInterview({
      name, email, role: role ?? "stakeholder",
      projectId: projectId ?? "unknown",
      customer: customer ?? "unknown",
      transcript, concerns, date,
    });
    res.json({ ok: true, ...result, concerns });
  }),
);
```

### 2.3 Extend `POST /api/start-call` — inject prior history as a dynamic variable
This is the *recall the agent uses live*. Locate the existing `/api/start-call` handler. After resolving `stakeholder` and before building the response, query HydraDB and add `prior_history` + `has_prior_history` to `dynamicVariables`:
```ts
// inside /api/start-call, after `const stakeholder = ...` is resolved:
const priorChunks = await lookupHistory({ name: stakeholder.name, email: stakeholder.email });
const priorHistory = formatPriorHistory(priorChunks);

// ...existing signed-url fetch + store.upsertCall(...) stay the same...

res.json({
  signedUrl: signed_url,
  callId: call.id,
  dynamicVariables: {
    stakeholder_id: stakeholderId,
    stakeholder_name: stakeholder.name,
    role: stakeholder.role,
    deal_profile_id: dealProfileId,
    // NEW — what the ElevenLabs agent uses to open differently on a return call:
    prior_history: priorHistory,
    has_prior_history: priorChunks.length > 0 ? "true" : "false",
  },
});
```
> The browser widget in `Stakeholders.tsx` currently builds its own `dynamic-variables` object inline (see §4.3) — it must also receive `prior_history`. The simplest correct approach: have `Stakeholders.tsx` pass through the `dynamicVariables` returned by `/api/start-call` instead of rebuilding them. Update both.

### 2.4 Extend `POST /api/conflict-map` — continuity-aware synthesis
Locate the existing `/api/conflict-map` handler. Keep everything it does; additionally load each returning stakeholder's HydraDB history and have Claude emit `continuityCards`. Steps:

1. After building `transcriptBlock`, build a `priorHistoryBlock`:
```ts
const priorByName = await Promise.all(
  profile.stakeholders.map(async (s) => {
    const chunks = await lookupHistory({ name: s.name, email: s.email });
    return { name: s.name, role: s.role, history: formatPriorHistory(chunks), hasHistory: chunks.length > 0 };
  }),
);
const returning = priorByName.filter((p) => p.hasHistory);
const priorHistoryBlock = returning.length
  ? returning.map((p) => `### ${p.name} (${p.role}) — prior history\n${p.history}`).join("\n\n")
  : "(no returning stakeholders)";
```

2. Extend `CONFLICT_SCHEMA` to also return `continuityCards`:
```ts
// add alongside the existing `conflicts` property:
continuityCards: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["stakeholder", "priorQuote", "currentQuote", "status", "notes"],
    properties: {
      stakeholder: { type: "string" },
      priorQuote: { type: "string" },
      currentQuote: { type: "string" },
      status: { type: "string", enum: ["resolved", "persisting", "escalated", "new"] },
      notes: { type: "string" },
    },
  },
},
```
And add `"continuityCards"` to the schema's top-level `required` array.

3. Append continuity instructions to `CONFLICT_SYSTEM` (keep the existing conflict rules intact):
```
Additionally, some stakeholders are RETURNING — we have prior interview history with them from earlier
projects. For each returning stakeholder, produce one continuityCards entry comparing a concern they raised
before to where it stands now:
- priorQuote: a VERBATIM line from their prior history.
- currentQuote: a VERBATIM line from their current transcript on the same theme (or "" if they did not touch it this time).
- status: "resolved" (prior concern is now addressed), "persisting" (still an open concern), "escalated"
  (worse / more urgent than before), or "new" (a fresh concern not seen before).
- notes: one concrete sentence for the PM about the trajectory.
If there are no returning stakeholders, return an empty continuityCards array.
```

4. Send both blocks in the user message:
```ts
user: `Here are the current transcripts:\n\n${transcriptBlock}\n\n` +
      `Here is prior interview history for returning stakeholders:\n\n${priorHistoryBlock}`,
```

5. Persist `continuityCards` on the conflict map row. Update `store.insertConflictMap` to accept and store them, and extend the `ConflictMap` type (see §2.6).

### 2.5 Extend `POST /api/call-webhook` — write the new interview to HydraDB
Locate the existing `/api/call-webhook` handler. After it stores the transcript on the call (`store.updateCall(... { status: "completed", transcript })`) and triggers `generateDocForCall`, also fire the memory write so the person's record grows (Tom goes from 1 → 2 interviews after the demo call):
```ts
// after store.updateCall(existing.id, { status: "completed", transcript: transcriptText || existing.transcript });
if (transcriptText) {
  const profile = store.getDealProfile(dealProfileId);
  const sh = profile?.stakeholders.find((s) => s.id === stakeholderId);
  if (sh) {
    writeInterview({
      name: sh.name,
      email: sh.email,
      role: sh.role,
      projectId: dealProfileId,
      customer: profile?.customer?.legalEntity ?? "unknown",
      transcript: transcriptText,
      // extract concerns inside writeInterview's caller:
      concerns: await extractConcerns(transcriptText),
    }).catch((e) => console.error("HydraDB interview write failed:", e));
  }
}
```
(Keep the existing `generateDocForCall(...)` trigger too.)

### 2.6 `GET /api/memory-log/stream` — SSE for the Memory Log panel
Streams every HydraDB op to the browser. Uses the `memoryLog` emitter and `recentMemoryLog()` backlog from `hydra.ts`.
```ts
app.get("/api/memory-log/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  // replay recent backlog so a late-opening panel isn't empty
  for (const e of recentMemoryLog()) res.write(`data: ${JSON.stringify(e)}\n\n`);

  const onEvent = (e: unknown) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  memoryLog.on("event", onEvent);

  const keepAlive = setInterval(() => res.write(": ping\n\n"), 15_000);
  req.on("close", () => {
    clearInterval(keepAlive);
    memoryLog.off("event", onEvent);
  });
});
```

### 2.7 Type + store changes (`server/types.ts`, `server/store.ts`)
- `server/types.ts`: add a `ContinuityCard` type and extend `ConflictMap`:
```ts
export type ContinuityCard = {
  stakeholder: string;
  priorQuote: string;
  currentQuote: string;
  status: "resolved" | "persisting" | "escalated" | "new";
  notes: string;
};
export type ConflictMap = {
  id: string;
  dealProfileId: string;
  conflicts: Conflict[];
  continuityCards: ContinuityCard[];   // NEW
  createdAt: string;
};
```
- `server/store.ts`: update `insertConflictMap(dealProfileId, conflicts, continuityCards = [])` to store `continuityCards`, and make the seeded empty map include `continuityCards: []` (the seed loads from JSON — see §5.3).

---

## 3. ElevenLabs configuration (done directly in the ElevenLabs dashboard)

The "agentic workflow" — turn-taking, when to probe, how to open — lives in the ElevenLabs agent, **not** in our backend. Our backend only feeds it memory via dynamic variables and writes the result back. Configure the agent in the dashboard:

### 3.1 Dynamic variables the agent expects
The agent receives these per call (passed by the widget; sourced from `/api/start-call`):
- `{{stakeholder_name}}`, `{{role}}`, `{{deal_profile_id}}`, `{{stakeholder_id}}`
- `{{prior_history}}` — formatted prior interviews (empty string if none)
- `{{has_prior_history}}` — `"true"` / `"false"`

### 3.2 System prompt (paste into the agent's System Prompt field)
```
You are PreKick, a warm, concise voice agent doing a ~90-second pre-kickoff interview with one stakeholder
on a professional-services onboarding deal. You are NOT reading a script — ask one natural question at a time
and follow up on what they actually say. Keep it to ~6–8 short exchanges, then close politely.

You are speaking with {{stakeholder_name}}, whose role is {{role}}.

MEMORY — this is what makes you different:
has_prior_history = {{has_prior_history}}
prior_history:
{{prior_history}}

If has_prior_history is "true": you have spoken with this person before. OPEN by referencing their single most
important prior concern by name, naturally, in your FIRST sentence — e.g. "Hi {{stakeholder_name}}, last time we
spoke the Salesforce integration was your biggest concern — where does that stand now?" Continue the conversation
as a continuation, not a fresh start. Acknowledge what has changed since last time.

If has_prior_history is "false": greet them as a first-time conversation and ask an opening discovery question
appropriate to their role.

Never invent prior history that is not in prior_history. Be specific, friendly, and brief.
```

### 3.3 First message (optional, keep dynamic)
Leave the first message empty / let the LLM generate it from the system prompt so the conditional opener works, OR set it to: `Hi {{stakeholder_name}}, thanks for taking a few minutes.`

### 3.4 Post-call webhook
In the agent's settings, set the **post-call webhook URL** to your deployed origin's `/api/call-webhook` (or a tunnel URL like `https://<ngrok>.ngrok.io/api/call-webhook` while testing locally). The handler already reads `dynamic_variables.deal_profile_id` and `dynamic_variables.stakeholder_id` to match the call — confirm those names match what the widget sends.

### 3.5 (Optional bonus — only if time remains) mid-call recall tool
For an extra "the agent queried memory itself" beat, add a **Webhook server tool** named `recall_stakeholder_history`:
- Method `POST`, URL `<origin>/api/stakeholder-history` (or a small POST variant).
- Parameter `name` (string) populated from `{{stakeholder_name}}`.
- Add an **assignment**: `source: response`, `value_path: interviews` (or a flattened string field you return), `dynamic_variable: prior_history`, `preserve_native_type: false`.
- This is genuinely riskier live than dynamic-variable injection, so keep §2.3 as the primary path and treat this as a bonus.

### 3.6 Agent-settings checklist (easy to miss — these silently break the demo)
Even with the system prompt written, confirm ALL of these in the ElevenLabs dashboard:

1. **Enable client overrides for dynamic variables.** Agent → **Security** (a.k.a. Overrides) → allow **Dynamic variables** to be set from the client. The `<elevenlabs-convai>` widget passes `dynamic-variables` from the browser; if overrides are not enabled, ElevenLabs **ignores them** and `{{prior_history}}` is empty — the memory opener won't fire. (If you also override the system prompt or first message from the client, enable those too; we don't, so dynamic variables is the only required one.)
2. **Set a default value for every dynamic variable** used in the prompt: `stakeholder_name`, `role`, `prior_history`, `has_prior_history`, `deal_profile_id`, `stakeholder_id`. ElevenLabs errors mid-conversation if a referenced variable has no value and none is provided. Safe defaults: empty string for `prior_history`, `"false"` for `has_prior_history`, `"there"` for `stakeholder_name`.
3. **Turn on the post-call webhook.** It's configured at **workspace level** (Conversational AI → Settings → Webhooks → Post-call webhook), then enabled per agent. The URL must be **publicly reachable** — while developing locally, run a tunnel (e.g. `ngrok http 8787`) and point it at `<tunnel>/api/call-webhook`. The webhook must include the transcript and `conversation_initiation_client_data.dynamic_variables` (default behavior); our handler already reads `deal_profile_id` + `stakeholder_id` from there.
4. **LLM for latency (optional, recommended).** Set the agent's LLM to **Gemini 2.5 Flash** (or another low-latency model) so the live call feels snappy. Our backend reasoning still uses Claude; this only affects the in-call agent.
5. **Voice + turn settings.** Pick a natural voice; keep default turn-taking. Nothing memory-specific here.

### 3.7 Phone vs. browser-mic — confirm which one the demo uses
The repo as built uses the **browser widget** (`<elevenlabs-convai>`, talk into your laptop mic). The official brief's script says "hand a judge a phone, the agent dials" — that is **literal outbound telephony**, which is NOT wired and needs extra setup (ElevenLabs ↔ Twilio number + the outbound-call API). For an 8-hour demo, the browser-mic widget is the reliable path and satisfies every memory requirement. **Only** add Twilio outbound if you specifically need a real phone ringing on stage — flag this decision before building it, as it is the single biggest scope risk and is unrelated to the memory wedge.

---

## 4. Frontend additions (ONLY these — everything else locked)

### 4.1 Memory Log panel (`src/components/AppLayout.tsx`)
A collapsible footer strip, visible on every authenticated screen, that streams HydraDB ops live. Requirements:
- Fixed/sticky strip at the bottom of the main column, ~36px collapsed (a header bar with a toggle), ~160px expanded.
- Subscribe with `EventSource("/api/memory-log/stream")`; append each parsed event.
- Auto-scroll to newest. Show `HH:MM:SS` timestamp + the `detail` string.
- Color-code: `READ` = blue, `WRITE` = green, `INFO` = muted.
- Leave it open during the demo.

Add a self-contained component (new file `src/components/MemoryLogPanel.tsx`) and render it once inside `AppLayout` after `<main>`:
```tsx
// src/components/MemoryLogPanel.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Database } from "lucide-react";
import { cn } from "@/lib/utils";

type LogEvent = { ts: string; op: "READ" | "WRITE" | "INFO"; detail: string };

export default function MemoryLogPanel() {
  const [open, setOpen] = useState(true);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/memory-log/stream");
    es.onmessage = (m) => {
      try { setEvents((prev) => [...prev.slice(-199), JSON.parse(m.data)]); } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [events.length]);

  const color = (op: LogEvent["op"]) =>
    op === "READ" ? "text-blue-400" : op === "WRITE" ? "text-green-400" : "text-muted-foreground";

  return (
    <div className="border-t border-border bg-zinc-950 text-zinc-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
      >
        <Database className="h-3.5 w-3.5" />
        HydraDB Memory Log
        <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">{events.length}</span>
        <span className="ml-auto">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</span>
      </button>
      {open && (
        <div ref={scrollRef} className="h-40 overflow-y-auto px-4 pb-3 font-mono text-[11px] leading-relaxed">
          {events.length === 0 && <div className="text-zinc-600">Waiting for HydraDB operations…</div>}
          {events.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-zinc-600">{new Date(e.ts).toLocaleTimeString()}</span>
              <span className={cn("font-semibold", color(e.op))}>[HYDRA {e.op}]</span>
              <span className="text-zinc-300">{e.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```
In `AppLayout.tsx`, import it and render it as the last child of the main column (the `<div className="flex-1 flex flex-col min-w-0">` block), right after `</main>`:
```tsx
        <main className="flex-1 overflow-y-auto">
          <Outlet context={outletContext} />
        </main>
        <MemoryLogPanel />
```

### 4.2 "Continuing from last time" cards (`src/pages/ConflictMap.tsx`)
- Extend the frontend `ConflictMapRow` type in `src/lib/types.ts` to include `continuityCards: ContinuityCard[]` (mirror the server type from §2.7).
- In `ConflictMap.tsx`, read `conflictMap?.continuityCards ?? []`. When non-empty, render a section **above** the conflict grid titled "Continuing from last time". Each card shows:
  - stakeholder name + a status badge (`resolved` green, `persisting` amber, `escalated` red, `new` blue),
  - the verbatim `priorQuote` (labeled "Last time") next to `currentQuote` (labeled "Now"),
  - the `notes` line.
- Reuse the existing `QuoteBlock` styling patterns for visual consistency; do not restyle the rest of the page.

### 4.3 Pass `prior_history` to the widget (`src/pages/Stakeholders.tsx`)
The `CallPanel` currently rebuilds `dynamic-variables` inline. Change `callNow` to keep the full `dynamicVariables` object returned by `/api/start-call`, store it in `liveCall` state, and pass it straight to the widget:
```tsx
// state shape:
const [liveCall, setLiveCall] = useState<{ callId: string; signedUrl: string; dynamicVariables: Record<string,string> } | null>(null);

// in callNow:
const data = await apiPost<{ callId: string; signedUrl: string; dynamicVariables: Record<string,string> }>(
  "/api/start-call", { dealProfileId, stakeholderId: stakeholder.id },
);
setLiveCall({ callId: data.callId, signedUrl: data.signedUrl, dynamicVariables: data.dynamicVariables });

// in the widget render:
<elevenlabs-convai
  signed-url={liveCall.signedUrl}
  dynamic-variables={JSON.stringify(liveCall.dynamicVariables)}
/>
```

### 4.4 (Optional, low risk) prior-history note on the transcript sheet
In the `CallPanel`, when a stakeholder has prior history, you may fetch `/api/stakeholder-history?name=...` and show a small "Returning stakeholder — N prior interview(s)" banner. Optional; skip if short on time.

---

## 5. Seed / mock data (do this before the demo)

### 5.1 Tom Becker's prior interview — the single most important asset
Tom Becker (IT lead, Northwind Retail) must already exist in HydraDB with one prior interview before the demo. Northwind in the demo is a **second engagement**, so Tom is a returning stakeholder. Use this transcript **verbatim** (it must be specific enough that the live agent's reference is convincing):

```
Agent: Thanks for making time, Tom. I want to understand the technical landscape before kickoff.
Stakeholder: Sure. Honestly, my first worry is the Salesforce integration. Last project it was a nightmare — their API kept rate-limiting us and the data model didn't match ours at all.
Agent: That sounds painful. What made it so hard to recover from?
Stakeholder: We lost about three weeks just on the integration. And the worst part is nobody asked me before scope was locked, so the estimate was already wrong by the time it reached me.
Agent: So you felt you weren't consulted early enough at scope time?
Stakeholder: Exactly. I was frustrated. If I'd been in the room we'd have budgeted the integration properly from day one.
Agent: Understood. How does the proposed timeline look to you this time?
Stakeholder: Frankly unrealistic. Whoever sold this thinks the integration is a couple of weeks. It is not. With testing it's closer to two months.
Agent: Got it — Salesforce integration risk, being consulted at scope time, and the timeline. Anything we should line up early?
Stakeholder: Sandbox access and an integration user, ideally before kickoff. And please loop me in before any dates are committed.
```

### 5.2 `server/seed-hydra.ts` (run once)
A standalone script that provisions the tenant and ingests Tom's interview, then verifies the read.
```ts
// server/seed-hydra.ts
import "dotenv/config";
import { ensureTenant, writeInterview, lookupHistory } from "./hydra.ts";

const TOM_TRANSCRIPT = `Agent: Thanks for making time, Tom. ...`; // ← paste the full transcript from §5.1

async function main() {
  await ensureTenant();
  const { id, subTenantId } = await writeInterview({
    name: "Tom Becker",
    email: "tom.becker@northwindretail.example",
    role: "it",
    projectId: "northwind-engagement-1",
    customer: "Northwind Retail GmbH",
    transcript: TOM_TRANSCRIPT,
    concerns: [
      "Salesforce integration complexity (API rate limits, data model mismatch)",
      "Not consulted at scope time",
      "Unrealistic timeline for the integration",
    ],
    date: "2026-01-15T10:00:00.000Z",
  });
  console.log("Seeded Tom interview:", id, "under", subTenantId);

  // verify the read returns it
  const back = await lookupHistory({ name: "Tom Becker", email: "tom.becker@northwindretail.example" });
  console.log(`Lookup returned ${back.length} interview(s).`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```
Add an npm script in `Guiding Hand/package.json`:
```json
"seed:hydra": "tsx server/seed-hydra.ts"
```
Run it once before the demo:
```sh
npm run seed:hydra
```

### 5.3 `data/northwind.json` — frame Northwind as the second engagement
- Keep the four stakeholders (Anya, Tom, Priya, Daniel). Tom's email must match what's seeded into HydraDB (`tom.becker@northwindretail.example`) so `stakeholderKey` lines up.
- Keep Anya + Tom transcripts completed (so a conflict map can be generated in the demo) and Priya + Daniel scheduled. Optionally tweak `scope.summary` to read like a follow-on engagement (e.g. "Phase 2 CRM rollout — second engagement").
- Add `"continuityCards": []` to the seeded empty conflict map object so it matches the new `ConflictMap` type.

### 5.4 What stays mocked
Thine coaching card, Nebius embeddings, Rocketlane export modal — leave exactly as they are.

---

## 6. Build order, test script, submission

### 6.1 Suggested order (protect the wedge: live call + Memory Log panel)
1. `server/hydra.ts` + `npm i @hydradb/sdk@^2` + env. Boot the server; confirm `ensureTenant` logs "ready".
2. `npm run seed:hydra`; confirm the lookup returns 1 interview and the terminal shows `[HYDRA WRITE]` then `[HYDRA READ]`.
3. `/api/stakeholder-history` + `/api/memory-log/stream`; add the Memory Log panel; confirm events stream to the browser.
4. Extend `/api/start-call` with `prior_history`; wire `Stakeholders.tsx` to pass it through. Configure the ElevenLabs system prompt (§3.2). **Test one live call end-to-end** — the agent must open by referencing Tom's Salesforce concern.
5. Extend `/api/conflict-map` with `continuityCards`; render the cards in `ConflictMap.tsx`.
6. Extend `/api/call-webhook` to write the new interview; run a demo call and confirm Tom now has 2 interviews.
7. Full dress rehearsal x2; pre-record a backup call.

### 6.2 Verification commands
```sh
# Tom should already be seeded:
curl 'http://localhost:8787/api/stakeholder-history?name=Tom%20Becker&email=tom.becker@northwindretail.example'

# Watch the live memory log (leave running during a demo):
curl -N http://localhost:8787/api/memory-log/stream
```
Acceptance checks:
- `/api/stakeholder-history` for Tom returns `count >= 1` before any demo call.
- Starting a call to Tom adds a `[HYDRA READ]` line and the returned `dynamicVariables.has_prior_history === "true"`.
- The ElevenLabs agent's first sentence references Tom's Salesforce concern.
- After the call, a `[HYDRA WRITE]` line appears and Tom's `count` increments to `2`.
- The conflict map response includes a non-empty `continuityCards` array with a verbatim `priorQuote`.
- Memory Log panel shows blue reads and green writes live, with timestamps.

### 6.3 Submission checklist
- [ ] Working demo (live or recorded) of recall → live reference → write.
- [ ] Repo pushed; `README.md` mentions HydraDB as the memory layer.
- [ ] Execution logs: screenshots of the Memory Log panel and/or `console`/SSE traces of HydraDB reads/writes.
- [ ] Submit via portal with code `MEMORY2026`. HydraDB credits `HYDRA2026` redeemed.

---

## 7. Definition of done
- HydraDB tenant `prekick` provisions on boot; Tom Becker seeded under `sub_tenant_id = tom-becker` with one interview.
- Before each call the backend autonomously reads HydraDB and injects `prior_history`; the agent's live opener changes because of it.
- After each call the webhook autonomously writes the new interview to HydraDB.
- The conflict map surfaces "Continuing from last time" cards for returning stakeholders.
- Every HydraDB read/write is visible in real time in the Memory Log panel.
- The existing in-memory store still owns deal profiles / calls / conflict maps; only interview memory lives in HydraDB. Thine, Nebius, and Rocketlane remain mocked.
