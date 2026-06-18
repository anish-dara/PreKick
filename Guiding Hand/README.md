# PreKick

Voice-first pre-kickoff agent for professional-services onboarding. See `../BUILD_BRIEF.md` and
`../CURSOR_INSTRUCTIONS.md` at the repo root for the full product context.

- **Frontend:** React + Tailwind + shadcn (`src/`), built in Lovable.
- **Backend:** a small Express API (`server/`) holding everything in memory, seeded from
  `data/northwind.json` on startup. No database — state resets on restart.
- **Reasoning:** Anthropic API (`claude-sonnet-4-6`), called server-side only.
- **Voice:** ElevenLabs Conversational AI, via the `<elevenlabs-convai>` browser widget + a
  post-call webhook handled by this same server.

## One-time setup

1. ```sh
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `ANTHROPIC_API_KEY`
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`

   These are read server-side only (`server/index.ts` via `dotenv`) — Vite never inlines them into
   the browser bundle since they aren't prefixed `VITE_`.

3. **ElevenLabs agent** — in the ElevenLabs dashboard, set the agent's post-call webhook URL to your
   server's `/api/call-webhook` route (e.g. `http://localhost:8787/api/call-webhook` while testing
   locally with a tunnel, or your deployed origin's `/api/call-webhook` in production).

## Run it

```sh
npm run dev          # runs the Vite frontend (:8080) and the Express API (:8787) together
```

Or run them separately in two terminals: `npm run dev:web` and `npm run dev:server`.

The frontend talks to `/api/*` paths; in dev, Vite proxies those to `http://localhost:8787`
(see `vite.config.ts`). In production, point your deployment at `server/index.ts` and serve the
built `dist/` from the same process (add static-file serving there if you deploy this as one app).

## Repo layout

- `src/pages/` — the 4 screens (Projects, Stakeholders, ConflictMap, Packet)
- `src/hooks/` — data-fetching hooks (react-query, calling `/api/*`)
- `src/lib/` — `api.ts` (fetch helpers), DB-shaped row types, deal-profile display mapping
- `data/northwind.json` — seed data: Northwind Retail deal profile, Anya + Tom's (pre-conflicting)
  transcripts, Priya + Daniel scheduled with no transcript yet, and an empty conflict map
- `server/store.ts` — in-memory state, loaded from `data/northwind.json` on boot
- `server/anthropic.ts` — Claude helper (structured JSON outputs, `claude-sonnet-4-6`)
- `server/matrix.ts` — required-documents matrix
- `server/index.ts` — Express app: the 7 API routes (3 Claude calls, doc gen, voice wiring)

## What's real vs mocked (see `CURSOR_INSTRUCTIONS.md` §6)

Real: SOW→Deal Profile extraction, conflict map synthesis, call→document generation, voice call
pipeline. Mocked: "Send to Rocketlane" export modal (top bar button) — intentionally left as a UI-only
success state.

## Note on persistence

State lives in memory and resets every time the server restarts — re-seeded fresh from
`data/northwind.json` each time. Anything created during a session (new deal profiles, new
transcripts, generated docs, conflict maps, kickoff packets) is lost on restart. Fine for a demo;
swap `server/store.ts` for a real datastore if this needs to survive restarts.
