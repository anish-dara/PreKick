# PreKick — Hackathon File Index

Pre-Kickoff Voice Agent · Rocketlane PS/Onboarding/Implementation Hackathon (June 18).

All files reflect the latest decisions: voice-first product, hybrid build (Lovable frontend → export → Cursor/Claude Code for DB + backend + integrations), conflict map built before voice.

## Files

- **pre-project-autopilot-plan.md** — the full strategic plan. The wedge, problem, product, call-triage map, conflict map, competitive landscape, demo script, hour-by-hour build plan, risks, and the application answers. Start here for the why and the pitch. (PDF version: `pre-project-autopilot-plan.pdf`.)

- **BUILD_BRIEF.md** — the master build overview for the whole project. Hybrid flow, tool split, data model, the three Claude calls, build order, real-vs-mocked. Keep this open as shared context throughout the build.

- **LOVABLE_PROMPT.md** — paste-ready prompt for Lovable. Frontend only, mock data, all four screens spec'd. This is step one of the build.

- **CURSOR_INSTRUCTIONS.md** — full instructions for the Cursor/Claude Code phase: Supabase schema, backend endpoints, the three Claude prompts, seed data, build order, demo flow. Point Claude Code at this after exporting from Lovable.

## Build order at a glance

1. Lovable → build frontend shell (use LOVABLE_PROMPT.md)
2. Export to GitHub early
3. Cursor/Claude Code → DB + backend + integrations (use CURSOR_INSTRUCTIONS.md)
   - Build the conflict map before the voice wiring
4. Mock the rest, rehearse the demo

## Still to do (the demo depends on it)

The sample SOW and the two conflicting stakeholder transcripts (Anya the sponsor, Tom the IT lead) are referenced everywhere but not yet written. The conflict map lives or dies on these. Generate them before build day.
