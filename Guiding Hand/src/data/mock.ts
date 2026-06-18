export const SOW_PLACEHOLDER = `STATEMENT OF WORK — CRM Implementation
Between: Northwind Retail GmbH ("Customer") and Acme Consulting Partners ("Provider")
Effective: 2026-07-01

Scope: Provider will deliver CRM implementation services and data migration
from the legacy system into Salesforce Sales Cloud, including integration with
the existing order management platform.

Commercials: Total fees of USD 240,000, billed in EUR. Payment terms Net 30.
Customer PO required prior to invoicing. Initial term: 12 months.

Stakeholders: Anya Müller (Executive Sponsor), Tom Becker (IT Lead),
Priya Shah (Project Lead), Daniel Roth (Finance).

Go-live target: 2026-09-15. Governing law: Germany (EU).`;

export type Confidence = "high" | "review";
export type Field = { label: string; value: string; confidence: Confidence; reviewNote?: string };

export const dealProfile = {
  customer: [
    { label: "Legal entity", value: "Northwind Retail GmbH", confidence: "high" as Confidence },
    { label: "Billing entity", value: "Northwind Retail Holdings", confidence: "review" as Confidence, reviewNote: "Two entities referenced in SOW" },
    { label: "Headquarters", value: "Munich, Germany / EU", confidence: "high" as Confidence },
    { label: "Industry", value: "Retail", confidence: "high" as Confidence },
    { label: "Size", value: "Enterprise", confidence: "high" as Confidence },
  ],
  commercial: [
    { label: "Contract value", value: "$240,000 USD", confidence: "high" as Confidence },
    { label: "Billing currency", value: "EUR", confidence: "high" as Confidence },
    { label: "Payment terms", value: "Net 30", confidence: "high" as Confidence },
    { label: "PO number", value: "Required — not yet provided", confidence: "review" as Confidence, reviewNote: "PO required but missing" },
    { label: "Term", value: "12 months", confidence: "high" as Confidence },
  ],
  scope: {
    summary: "CRM implementation and data migration",
    deliverables: [
      "Salesforce Sales Cloud configuration & rollout",
      "Legacy CRM data migration (cleanse + load)",
      "Integration with order management platform",
      "Admin training & runbook handoff",
    ],
    startDate: "2026-07-01",
    goLive: "2026-09-15",
  },
  compliance: [
    { label: "GDPR Addendum", reason: "EU customer" },
    { label: "DPA", reason: "Personal data processing" },
    { label: "SOC 2 Request", reason: "Enterprise security review" },
    { label: "Order Form", reason: "Commercial execution" },
    { label: "Billing Setup", reason: "Separate billing entity" },
  ],
};

export type CallStatus = "Completed" | "Scheduled";
export type Stakeholder = {
  id: string;
  name: string;
  role: string;
  status: CallStatus;
  initials: string;
};

export const stakeholders: Stakeholder[] = [
  { id: "anya", name: "Anya Müller", role: "Exec Sponsor", status: "Completed", initials: "AM" },
  { id: "tom", name: "Tom Becker", role: "IT Lead", status: "Completed", initials: "TB" },
  { id: "priya", name: "Priya Shah", role: "Project Lead", status: "Scheduled", initials: "PS" },
  { id: "daniel", name: "Daniel Roth", role: "Finance", status: "Scheduled", initials: "DR" },
];

export type TranscriptLine = { speaker: "Agent" | "Stakeholder"; text: string };

export const transcripts: Record<string, { lines: TranscriptLine[]; doc: { title: string; bullets: string[] } }> = {
  anya: {
    lines: [
      { speaker: "Agent", text: "Thanks for taking the call, Anya. I'd like to confirm what success looks like for this CRM rollout." },
      { speaker: "Stakeholder", text: "Success is adoption across all regions by Q3. We've been burned by half-finished tools before." },
      { speaker: "Agent", text: "Understood. And on timeline — what's the latest you'd want to be live?" },
      { speaker: "Stakeholder", text: "We need to be live within six weeks. The board has visibility on this." },
      { speaker: "Agent", text: "Noted. Any integrations you're particularly concerned about?" },
      { speaker: "Stakeholder", text: "No, the Salesforce integration should be simple. Tom can handle it." },
      { speaker: "Agent", text: "Got it. Last one — who has sign-off authority on scope changes?" },
      { speaker: "Stakeholder", text: "Priya as project lead, but I want to be in the loop." },
    ],
    doc: {
      title: "Requirements Summary — Anya Müller",
      bullets: [
        "Success criteria: full-region adoption by Q3",
        "Desired go-live: within 6 weeks (board visibility)",
        "Sponsor expects Salesforce integration to be simple",
        "Scope sign-off: Priya leads, Anya kept in loop",
      ],
    },
  },
  tom: {
    lines: [
      { speaker: "Agent", text: "Hi Tom — I'd like to walk through the technical landscape." },
      { speaker: "Stakeholder", text: "Sure. Realistically this is a Q2 project — the integration alone is 8+ weeks." },
      { speaker: "Agent", text: "What's driving that estimate?" },
      { speaker: "Stakeholder", text: "Their API was a nightmare last time; this is the biggest risk on the project." },
      { speaker: "Agent", text: "Are there any environments or access we need to line up early?" },
      { speaker: "Stakeholder", text: "Sandbox access, an integration user, and time with our middleware team." },
      { speaker: "Agent", text: "Any concerns about the rollout itself?" },
      { speaker: "Stakeholder", text: "Honestly — I wish we'd been consulted earlier in the buying cycle." },
    ],
    doc: {
      title: "Requirements Summary — Tom Becker",
      bullets: [
        "IT estimate: 8+ weeks for integration, full project = Q2",
        "Biggest risk: prior API issues with Salesforce integration",
        "Needs: sandbox, integration user, middleware team time",
        "Relationship signal: feels excluded from buying decision",
      ],
    },
  },
  priya: {
    lines: [
      { speaker: "Agent", text: "Hi Priya — thanks for making time. I'd like to align on delivery model." },
      { speaker: "Stakeholder", text: "Happy to. Just to flag — we only have capacity to pilot one region first." },
      { speaker: "Agent", text: "Which region would you start with?" },
      { speaker: "Stakeholder", text: "DACH. It's where the change management is most ready." },
      { speaker: "Agent", text: "And what does a successful pilot look like to you?" },
      { speaker: "Stakeholder", text: "30 active users, weekly pipeline reviews running in the tool, and clean data." },
      { speaker: "Agent", text: "Any blockers you can foresee?" },
      { speaker: "Stakeholder", text: "Conflicting priorities with the ERP project — we'll need to sequence carefully." },
    ],
    doc: {
      title: "Requirements Summary — Priya Shah",
      bullets: [
        "Capacity allows for single-region pilot (DACH first)",
        "Pilot success: 30 active users, weekly pipeline reviews, clean data",
        "Sequencing risk with concurrent ERP project",
        "Project lead aligned on phased rollout approach",
      ],
    },
  },
  daniel: {
    lines: [
      { speaker: "Agent", text: "Hi Daniel — I'm gathering the billing and compliance details." },
      { speaker: "Stakeholder", text: "Go ahead. Invoicing entity is Northwind Retail Holdings, not the GmbH." },
      { speaker: "Agent", text: "Noted. PO required before first invoice?" },
      { speaker: "Stakeholder", text: "Yes. I'll have it issued in the next two weeks." },
      { speaker: "Agent", text: "And the GDPR addendum — who signs?" },
      { speaker: "Stakeholder", text: "Our DPO. I can route it. SOC 2 report request will come from security." },
      { speaker: "Agent", text: "Anything unusual on payment side we should plan around?" },
      { speaker: "Stakeholder", text: "We pay in EUR but the contract is USD-denominated. FX handling needs to be clear." },
    ],
    doc: {
      title: "Requirements Summary — Daniel Roth",
      bullets: [
        "Billing entity confirmed: Northwind Retail Holdings",
        "PO to be issued within 2 weeks",
        "GDPR addendum routed through DPO; SOC 2 via security team",
        "USD contract / EUR payment — FX terms need clarification",
      ],
    },
  },
};

export type Conflict = {
  category: "Timeline" | "Success Criteria" | "Authority" | "Assumption";
  severity: "high" | "medium";
  left: { name: string; role: string; quote: string };
  right: { name: string; role: string; quote: string };
  resolution: string;
};

export const conflicts: Conflict[] = [
  {
    category: "Timeline",
    severity: "high",
    left: { name: "Anya Müller", role: "Sponsor", quote: "We need to be live within six weeks." },
    right: { name: "Tom Becker", role: "IT Lead", quote: "Realistically this is a Q2 project — the integration alone is 8+ weeks." },
    resolution: "Align on a phased go-live; surface the integration timeline in kickoff.",
  },
  {
    category: "Assumption",
    severity: "high",
    left: { name: "Anya Müller", role: "Sponsor", quote: "The Salesforce integration should be simple." },
    right: { name: "Tom Becker", role: "IT Lead", quote: "Their API was a nightmare last time; this is the biggest risk." },
    resolution: "Add an integration spike to week one; set sponsor expectations.",
  },
  {
    category: "Success Criteria",
    severity: "medium",
    left: { name: "Anya Müller", role: "Sponsor", quote: "Success is adoption across all regions by Q3." },
    right: { name: "Priya Shah", role: "Project Lead", quote: "We only have capacity to pilot one region first." },
    resolution: "Define phase-1 success as a single-region pilot.",
  },
];

export const stakeholderMap = [
  { name: "Anya Müller", role: "Exec Sponsor", disposition: "Champion — pushing for speed", tone: "positive" as const },
  { name: "Tom Becker", role: "IT Lead", disposition: "Skeptical on timeline; key technical risk owner", tone: "warning" as const },
  { name: "Priya Shah", role: "Project Lead", disposition: "Pragmatic — favors phased pilot", tone: "neutral" as const },
  { name: "Daniel Roth", role: "Finance", disposition: "Cooperative — billing details outstanding", tone: "neutral" as const },
];

export const risks = [
  { risk: "Salesforce integration complexity (API history)", severity: "High", mitigation: "Run integration spike in week 1" },
  { risk: "Sponsor / IT timeline mismatch (6 wks vs Q2)", severity: "High", mitigation: "Agree phased go-live at kickoff" },
  { risk: "Scope ambition exceeds delivery capacity", severity: "Medium", mitigation: "Define phase-1 as single-region pilot" },
];

export const landmines = [
  "IT lead is frustrated about not being consulted earlier — acknowledge their expertise in kickoff.",
  "Sponsor and project lead have diverging definitions of success — do not let this surface for the first time on stage.",
  "Billing entity inconsistency in the SOW — confirm with Finance before first invoice to avoid an awkward AR conversation.",
];

export const agenda = [
  "Introductions & roles — 10 min",
  "Confirmed scope & phased go-live plan — 20 min",
  "Technical risk review (integration spike) — 20 min",
  "Success criteria for phase-1 pilot — 15 min",
  "Governance, change control, next steps — 15 min",
];

export const executiveSummary =
  "Northwind Retail is a 12-month, $240K USD CRM implementation engaging four named stakeholders. The deal is commercially clean but carries two material risks heading into kickoff: a six-week vs. eight-week timeline gap between sponsor and IT, and a regional-scope expectation gap between sponsor and project lead. We recommend opening kickoff with a phased go-live proposal and an integration spike committed for week one.";

export const projects = [
  { id: "northwind", name: "Northwind Retail — CRM Implementation", active: true },
  { id: "contoso", name: "Contoso Logistics — ERP Rollout", active: false },
  { id: "fabrikam", name: "Fabrikam Bank — Onboarding Revamp", active: false },
];
