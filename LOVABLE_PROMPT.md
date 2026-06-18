# Lovable Prompt — Pre-Kickoff Voice Agent (FRONTEND ONLY)

> Paste everything below the line into Lovable as your build prompt. It builds the UI shell only — no backend, no real integrations. You'll export to GitHub and wire the backend in Cursor afterward. If Lovable tries to add backend logic or real API calls, tell it to keep everything as frontend with mock data.

---

Build a clean, modern web app called **PreKick** — a pre-kickoff voice agent dashboard for professional-services onboarding teams. This is a frontend-only build: use hardcoded mock/dummy data for everything, no backend, no real API calls, no authentication. React + Tailwind. Design should be minimal, professional, and confident — think a polished B2B SaaS tool. Neutral background, one strong accent color, generous whitespace. The conflict map screen is the visual centerpiece and should feel special.

## Context (so the UI makes sense)
The product puts an AI **voice agent** on the routine "information" calls in customer onboarding (requirements gathering, billing/legal detail collection, scope confirmation), turns each call into paperwork automatically, and — because it's spoken to every stakeholder — surfaces a **conflict map** of where stakeholders silently disagree. Humans keep the judgment calls (negotiation, relationship); the agent takes the information calls. Build the following screens with a left-sidebar navigation layout.

## Global layout
- Left sidebar nav with the app name "PreKick" at top and these items: **Projects**, **Stakeholders & Calls**, **Conflict Map**, **Kickoff Packet**.
- Top bar with a project selector dropdown (default selected: "Northwind Retail — CRM Implementation") and a primary button "Send to Rocketlane" that opens a mock success modal showing a populated-project preview.
- Main content area renders the selected screen.

## Screen 1 — Projects / Setup
- A header "New Project Intake".
- A large text area labeled "Paste signed SOW / MSA" prefilled with a few lines of realistic placeholder SOW text.
- A button "Extract Deal Profile" — on click, show a brief fake loading state (~1.5s) then reveal the Deal Profile card below.
- **Deal Profile card** displaying mock extracted data in labeled sections:
  - Customer: Northwind Retail GmbH (legal), Northwind Retail Holdings (billing), Munich, Germany / EU, Industry: Retail, Size: Enterprise.
  - Commercial: $240,000, EUR, Net 30, PO required: Yes, Term: 12 months.
  - Scope: "CRM implementation and data migration", deliverables list (3–4 items), Start: 2026-07-01, Go-live: 2026-09-15.
  - Compliance — show as small colored "required document" chips: GDPR Addendum, DPA, SOC 2 Request, Order Form, Billing Setup. (These are auto-derived from EU + Enterprise.)
- Each field has a small confidence indicator (green = high, amber = needs review). Make 2 fields amber with a small "review" tag (e.g. billing entity, PO number).

## Screen 2 — Stakeholders & Calls
- A table/list of stakeholders extracted from the SOW. Columns: Name, Role, Status, Action.
- Seed these rows:
  - Anya Müller — Exec Sponsor — Status: Completed — Action: "View transcript"
  - Tom Becker — IT Lead — Status: Completed — Action: "View transcript"
  - Priya Shah — Project Lead — Status: Scheduled — Action: "Call now"
  - Daniel Roth — Finance — Status: Scheduled — Action: "Call now"
- A "Call now" button opens a **Live Call view** (modal or panel): shows a simulated live transcript streaming in line by line (fake, ~6–8 exchanges between "Agent" and "Stakeholder"), a pulsing "● Live" indicator, and when it finishes, a card slides in titled "Auto-generated document: Requirements Summary" with a few bullet points filled from the conversation.
- "View transcript" opens the same panel but shows a completed transcript statically plus its generated document.

## Screen 3 — Conflict Map (CENTERPIECE — make this polished)
- Header: "Cross-Stakeholder Conflict Map" with subtitle "What your stakeholders disagree on — before kickoff."
- Render a set of **conflict cards**, each showing:
  - A category label as a colored tag (Timeline, Success Criteria, Authority, Assumption).
  - Two opposing quotes side by side, each attributed to a stakeholder name + role, with a vs. divider in the middle. The conflicting side highlighted in red.
  - A "Suggested resolution" line at the bottom in a subtle box.
- Seed 3 conflict cards:
  1. **Timeline** — Anya Müller (Sponsor): "We need to be live within six weeks." vs. Tom Becker (IT Lead): "Realistically this is a Q2 project — the integration alone is 8+ weeks." Resolution: "Align on a phased go-live; surface the integration timeline in kickoff."
  2. **Assumption** — Anya Müller (Sponsor): "The Salesforce integration should be simple." vs. Tom Becker (IT Lead): "Their API was a nightmare last time; this is the biggest risk." Resolution: "Add an integration spike to week one; set sponsor expectations."
  3. **Success Criteria** — Anya Müller (Sponsor): "Success is adoption across all regions by Q3." vs. Priya Shah (Project Lead): "We only have capacity to pilot one region first." Resolution: "Define phase-1 success as a single-region pilot."
- At the top, a small summary stat row: "3 conflicts detected · 2 high severity · across 4 stakeholders."

## Screen 4 — Kickoff Packet
- A document-style layout with sections:
  - **Executive summary** (a short mock paragraph).
  - **Stakeholder map** — simple list of the 4 stakeholders with a one-line role/disposition each (e.g. "Champion", "Skeptical on timeline").
  - **Risk register** — a small table: Risk | Severity | Mitigation (3 rows, drawn from the conflicts).
  - **Hidden landmines** (PM-eyes-only, styled as a subtle callout box): e.g. "IT lead is frustrated about not being consulted earlier — acknowledge their expertise in kickoff."
  - **Suggested kickoff agenda** — numbered list of 4–5 items.
- A button at the top "Export packet" (mock, no real action).

## Mock "Send to Rocketlane" modal
- Triggered from the top bar button. Shows a success state: "Project created in Rocketlane" with a preview list — "✓ 4 stakeholders added as contacts", "✓ 3 risks added to register", "✓ Kickoff agenda created", "✓ Success criteria set as project goals". A note at the bottom: "PreKick feeds the human context Nitro can't capture."

## Important constraints
- Everything is mock/hardcoded — no backend, no real API calls, no auth, no database writes.
- Keep all data in React state/constants so it's easy to later replace with real API data.
- Prioritize the Conflict Map screen's visual quality; it's the demo centerpiece.
- Don't build login, settings, or anything not listed above.
