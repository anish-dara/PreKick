# PreKick

AI-automated pre-kickoff intelligence for professional-services teams.

PreKick automates the window between contract signing and kickoff — the stretch where PS teams manually chase stakeholders, reconcile conflicting expectations, and assemble documentation. The core loop: extract a deal profile from a SOW, place real AI voice calls to each stakeholder, synthesize a cross-stakeholder conflict map, and generate a full kickoff packet.

## How it works

1. **Contract intake** — paste a signed SOW/MSA. Claude extracts a structured deal profile: customer, commercial terms, scope, stakeholders, compliance flags.
2. **Stakeholder calls** — the agent dials each named stakeholder via ElevenLabs Conversational AI. A post-call webhook delivers the transcript automatically.
3. **Conflict map** — Claude reads all transcripts and surfaces disagreements by category (timeline, authority, assumption, success criteria) with suggested resolutions.
4. **Kickoff packet** — Claude synthesizes everything into a packet: executive summary, stakeholder map with tone, risk register, hidden landmines (PM-only), and suggested agenda.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Express 4 + TypeScript (tsx) |
| AI reasoning | Anthropic Claude (`claude-sonnet-4-6`) |
| Voice | ElevenLabs Conversational AI |
| State | In-memory (resets on server restart — no database) |
| Data fetching | TanStack Query |

## Repo layout

```
Guiding Hand/
├── src/
│   ├── pages/          # Landing, Projects, Stakeholders, Scheduling, ConflictMap, Packet
│   ├── components/     # AppLayout (sidebar nav + project switcher), PageHeader, shadcn/ui
│   ├── hooks/          # useDealProfiles, useStakeholderCalls (react-query → /api/*)
│   └── lib/            # api.ts, types.ts, dealProfileDisplay.ts
├── server/
│   ├── index.ts        # Express app — all 7 API routes
│   ├── anthropic.ts    # Claude helper (structured JSON extraction)
│   ├── store.ts        # In-memory state, seeded from data/northwind.json
│   ├── matrix.ts       # Required-documents matrix (drives compliance chips)
│   └── types.ts        # Shared type definitions
├── data/
│   └── northwind.json  # Seed deal (Northwind Retail), two stakeholder transcripts
└── .env                # API keys (git-ignored)
```

## Setup

```sh
cd "Guiding Hand"
npm install
cp .env.example .env   # fill in the three keys below
npm run dev            # frontend → :8080, API → :8787
```

Required env vars:

| Key | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API keys |
| `ELEVENLABS_AGENT_ID` | Create a ConvAI agent in ElevenLabs dashboard, copy the ID |

**ElevenLabs webhook:** set your agent's post-call webhook URL to `http://<host>/api/call-webhook`. Locally this requires a tunnel (ngrok etc.) — without it, calls connect but transcripts and generated documents never arrive.

## API routes

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/extract-profile` | SOW text → Claude → `DealProfileRow` stored in memory |
| `GET` | `/api/deal-profiles` | All deal profiles |
| `GET` | `/api/deal-profiles/:id` | Single deal profile |
| `POST` | `/api/start-call` | Gets a signed ElevenLabs URL, creates a call record |
| `POST` | `/api/call-webhook` | ElevenLabs post-call hook — saves transcript, generates doc via Claude |
| `POST` | `/api/conflict-map` | All transcripts → Claude → conflict map with resolutions |
| `POST` | `/api/kickoff-packet` | Deal + conflicts + transcripts → Claude → full kickoff packet |

## What's real vs. mocked

**Real (live API calls):** SOW extraction, voice calls, post-call transcripts, per-call document generation, conflict map, kickoff packet.

**Mocked (UI only):** "Send to Rocketlane" button (toast), scheduling bookings (toast, no persistence), export packet button (disabled).

## Known limitations

- **No database** — state resets on every server restart. Needs a real store before any data can survive.
- **No file parsing** — SOW intake is paste-only. File upload UI exists but the backend has no PDF/DOCX parsing.
- **No auth or multi-tenancy** — all visitors share the same in-memory state.
- **Webhook requires a public URL** — local development needs a tunnel for end-to-end call testing.
- **ElevenLabs agent is manually configured** — agent script, persona, and webhook URL must be set in the ElevenLabs dashboard.
- **Single active deal** — the project switcher shows multiple deals but the data model effectively scopes to one at a time.
