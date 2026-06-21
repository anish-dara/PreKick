import "dotenv/config";
import { ensureTenant, writeInterview, lookupHistory, type InterviewWrite } from "./hydra.ts";

// ---------------------------------------------------------------------------
// One-time pre-demo seed: write each returning stakeholder's PRIOR interview
// (engagement #1) into HydraDB.
//
// Northwind in the live demo is a SECOND engagement, so these people are
// returning stakeholders. Each prior transcript is deliberately written to
// contrast with their CURRENT call (data/northwind.json) so the Anthropic
// synthesis produces convincing "Continuing from last time" continuity cards:
//
//   Tom   — flagged Salesforce integration as the #1 risk last time → still does.
//   Anya  — downplayed the integration ("IT will handle it") and it stalled →
//           she is downplaying it again this time.
//   Priya — scope changes bypassed her last time and the date slipped → this
//           time she is insisting everything routes through her.
//
// Run once before the demo:  npm run seed:hydra
// ---------------------------------------------------------------------------

const INTERVIEWS: InterviewWrite[] = [
  {
    name: "Tom Becker",
    email: "tom.becker@northwindretail.example",
    role: "it",
    projectId: "northwind-engagement-1",
    customer: "Northwind Retail GmbH",
    date: "2026-01-15T10:00:00.000Z",
    transcript: `Agent: Thanks for making time, Tom. I want to understand the technical landscape before kickoff.
Stakeholder: Sure. Honestly, my first worry is the Salesforce integration. Last project it was a nightmare — their API kept rate-limiting us and the data model didn't match ours at all.
Agent: That sounds painful. What made it so hard to recover from?
Stakeholder: We lost about three weeks just on the integration. And the worst part is nobody asked me before scope was locked, so the estimate was already wrong by the time it reached me.
Agent: So you felt you weren't consulted early enough at scope time?
Stakeholder: Exactly. I was frustrated. If I'd been in the room we'd have budgeted the integration properly from day one.
Agent: Understood. How does the proposed timeline look to you this time?
Stakeholder: Frankly unrealistic. Whoever sold this thinks the integration is a couple of weeks. It is not. With testing it's closer to two months.
Agent: Got it — Salesforce integration risk, being consulted at scope time, and the timeline. Anything we should line up early?
Stakeholder: Sandbox access and an integration user, ideally before kickoff. And please loop me in before any dates are committed.`,
    concerns: [
      "Salesforce integration complexity (API rate limits, data model mismatch)",
      "Not consulted at scope time",
      "Unrealistic timeline for the integration",
    ],
  },
  {
    name: "Anya Müller",
    email: "anya.muller@northwindretail.example",
    role: "sponsor",
    projectId: "northwind-engagement-1",
    customer: "Northwind Retail GmbH",
    date: "2026-01-14T09:00:00.000Z",
    transcript: `Agent: Thanks for the time, Anya. Looking back at the first CRM phase, what stands out to you?
Stakeholder: Honestly, the integration. I assumed it would be straightforward — I kept telling everyone IT would just handle it. It turned out to be the thing that stalled us.
Agent: So the integration was harder than you expected?
Stakeholder: Much harder. And because I'd promised the board a fast go-live, we shipped half-finished and adoption suffered. People didn't trust the tool.
Agent: What would you do differently next time?
Stakeholder: I'd still want speed — the board expects it — but I should lean on Tom's estimate instead of my own optimism. Adoption is what I'll be judged on.
Agent: Anything on sign-off or scope?
Stakeholder: Priya runs scope day to day, but I want to stay in the loop on anything that affects the timeline.`,
    concerns: [
      "Underestimated Salesforce integration complexity (assumed IT would handle it)",
      "Aggressive board-driven go-live led to low adoption",
      "Tension between wanting speed and being judged on adoption",
    ],
  },
  {
    name: "Priya Shah",
    email: "priya.shah@northwindretail.example",
    role: "projectLead",
    projectId: "northwind-engagement-1",
    customer: "Northwind Retail GmbH",
    date: "2026-01-16T11:00:00.000Z",
    transcript: `Agent: Priya, reflecting on the first phase, what was hardest to manage?
Stakeholder: Scope. Changes kept coming straight from Anya to the team without going through me. I was accountable for the date but I didn't control what was in scope.
Agent: How did that affect the project?
Stakeholder: We slipped twice. Every time I thought we were locked, a new "small ask" appeared and the timeline moved.
Agent: Did you raise it at the time?
Stakeholder: I did, but it was late. By then the date had already been promised to the board.
Agent: What would help this time?
Stakeholder: A single intake for scope changes — through me — and realistic estimates from Tom baked in before any date is committed.`,
    concerns: [
      "Scope changes bypassed the project lead (sponsor → team directly)",
      "Accountable for the date without controlling scope",
      "Timeline slipped repeatedly due to uncontrolled scope creep",
    ],
  },
];

async function main() {
  console.log("Provisioning HydraDB tenant…");
  await ensureTenant();

  for (const interview of INTERVIEWS) {
    console.log(`Writing ${interview.name}'s prior interview…`);
    const { id, subTenantId } = await writeInterview(interview);
    console.log(`  → interview ${id} under sub_tenant "${subTenantId}".`);
  }

  console.log("Verifying recall…");
  // small delay to let indexing settle before the verification reads
  await new Promise((r) => setTimeout(r, 5000));
  for (const interview of INTERVIEWS) {
    const back = await lookupHistory({ name: interview.name, email: interview.email });
    console.log(`  ${interview.name}: lookup returned ${back.length} interview(s).`);
    if (back.length === 0) {
      console.warn(`  ⚠ ${interview.name} recall returned 0 — indexing may still be in progress.`);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
