import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { store } from "./store.ts";
import { claudeJSON } from "./anthropic.ts";
import { computeRequiredDocs } from "./matrix.ts";
import type { Conflict, DealProfile, GeneratedDocument, KickoffPacket, StakeholderCall } from "./types.ts";

const PORT = Number(process.env.PORT) || 8787;

const app = express();
app.use(cors());
app.use(express.json());

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch((err) => {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    });
  };
}

// ---------------------------------------------------------------------------
// Deal profiles (reads)
// ---------------------------------------------------------------------------

app.get("/api/deal-profiles", (_req, res) => {
  res.json(store.listDealProfiles());
});

app.get("/api/deal-profiles/:id", (req, res) => {
  const profile = store.getDealProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "Deal profile not found" });
  res.json(profile);
});

app.get("/api/deal-profiles/:id/calls", (req, res) => {
  res.json(store.listCallsForProfile(req.params.id));
});

app.get("/api/deal-profiles/:id/conflict-map", (req, res) => {
  res.json(store.latestConflictMap(req.params.id));
});

app.get("/api/deal-profiles/:id/kickoff-packet", (req, res) => {
  res.json(store.latestKickoffPacket(req.params.id));
});

app.get("/api/generated-documents/:id", (req, res) => {
  const doc = store.getGeneratedDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  res.json(doc);
});

// ---------------------------------------------------------------------------
// (a) SOW -> Deal Profile
// ---------------------------------------------------------------------------

const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["customer", "commercial", "scope", "stakeholders", "meta"],
  properties: {
    customer: {
      type: "object",
      additionalProperties: false,
      required: ["legalEntity", "billingEntity", "address", "billingAddress", "taxId", "industry", "sizeBand", "region"],
      properties: {
        legalEntity: { type: "string" },
        billingEntity: { type: "string" },
        address: { type: "string" },
        billingAddress: { type: "string" },
        taxId: { type: ["string", "null"] },
        industry: { type: "string" },
        sizeBand: { type: "string", enum: ["smb", "midmarket", "enterprise"] },
        region: { type: "string" },
      },
    },
    commercial: {
      type: "object",
      additionalProperties: false,
      required: ["totalValue", "currency", "paymentTerms", "milestones", "poRequired", "poNumber", "termLength"],
      properties: {
        totalValue: { type: ["number", "null"] },
        currency: { type: "string" },
        paymentTerms: { type: "string" },
        milestones: { type: "array", items: { type: "string" } },
        poRequired: { type: "boolean" },
        poNumber: { type: ["string", "null"] },
        termLength: { type: "string" },
      },
    },
    scope: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "deliverables", "exclusions", "startDate", "goLiveDate", "milestones", "dependencies"],
      properties: {
        summary: { type: "string" },
        deliverables: { type: "array", items: { type: "string" } },
        exclusions: { type: "array", items: { type: "string" } },
        startDate: { type: ["string", "null"] },
        goLiveDate: { type: ["string", "null"] },
        milestones: { type: "array", items: { type: "string" } },
        dependencies: { type: "array", items: { type: "string" } },
      },
    },
    stakeholders: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "email", "role", "phone"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: ["string", "null"] },
          role: { type: "string", enum: ["sponsor", "projectLead", "it", "finance", "champion", "procurement"] },
          phone: { type: ["string", "null"] },
        },
      },
    },
    meta: {
      type: "object",
      additionalProperties: false,
      required: ["fieldConfidence", "fieldSource", "flaggedForReview"],
      properties: {
        // Claude's structured outputs only allow additionalProperties: false, so dotted-path ->
        // value maps are expressed as arrays of pairs here and converted to Records below.
        fieldConfidence: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["path", "confidence"],
            properties: {
              path: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
          },
        },
        fieldSource: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["path", "source"],
            properties: { path: { type: "string" }, source: { type: "string" } },
          },
        },
        flaggedForReview: { type: "array", items: { type: "string" } },
      },
    },
  },
};

const EXTRACT_SYSTEM = `You extract a structured Deal Profile from a signed SOW/MSA for a professional-services onboarding tool.
Rules:
- Only state facts present or directly inferable from the text. Never invent values.
- "id" for each stakeholder is a short lowercase slug derived from their first name (e.g. "anya").
- sizeBand: infer from headcount/revenue language if present, otherwise "midmarket" as a neutral default with low confidence.
- region: use "EU" for European Union/EEA countries, "US" for United States, else the country/region name.
- For every top-level field, record a confidence in meta.fieldConfidence keyed by dotted path (e.g. "customer.billingEntity") as "high" | "medium" | "low", and a one-line source note in meta.fieldSource (e.g. "stated in Commercials section").
- Add any dotted path you are not confident about to meta.flaggedForReview. Never guess a value you cannot find — use null and flag it instead.`;

app.post(
  "/api/extract-profile",
  asyncHandler(async (req, res) => {
    const { sowText } = req.body ?? {};
    if (!sowText || typeof sowText !== "string") {
      res.status(400).json({ error: "sowText is required" });
      return;
    }

    const extracted = await claudeJSON<{
      customer: DealProfile["customer"];
      commercial: DealProfile["commercial"];
      scope: DealProfile["scope"];
      stakeholders: DealProfile["stakeholders"];
      meta: {
        fieldConfidence: Array<{ path: string; confidence: "high" | "medium" | "low" }>;
        fieldSource: Array<{ path: string; source: string }>;
        flaggedForReview: string[];
      };
    }>({
      system: EXTRACT_SYSTEM,
      user: `Extract the Deal Profile from this SOW:\n\n${sowText}`,
      schema: EXTRACT_SCHEMA,
      effort: "medium",
    });

    const meta: DealProfile["meta"] = {
      fieldConfidence: Object.fromEntries(extracted.meta.fieldConfidence.map((f) => [f.path, f.confidence])),
      fieldSource: Object.fromEntries(extracted.meta.fieldSource.map((f) => [f.path, f.source])),
      flaggedForReview: extracted.meta.flaggedForReview,
    };

    const requiredDocs = computeRequiredDocs(extracted.customer);
    const compliance = {
      requiredDocs,
      flaggedClauses: [],
      dataResidency: extracted.customer.region ?? null,
      securityLevel: extracted.customer.sizeBand === "enterprise" ? "enterprise" : "standard",
    };

    const profile = store.insertDealProfile({
      customer: extracted.customer,
      commercial: extracted.commercial,
      scope: extracted.scope,
      stakeholders: extracted.stakeholders,
      compliance,
      meta,
    });

    res.json(profile);
  }),
);

// ---------------------------------------------------------------------------
// (b) In-call dynamic questioning
// ---------------------------------------------------------------------------

const NEXT_QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["question"],
  properties: { question: { type: "string" } },
};

const ROLE_BANKS: Record<string, string> = {
  sponsor: "business outcome, board visibility, what failure costs them, politics, budget reality",
  projectLead: "real capacity, competing priorities, team morale, prior tool fatigue",
  it: "integration reality, security timeline, sandbox access, change windows, sign-off authority",
  finance: "billing entity and contacts, PO process and timing, payment terms, compliance document routing",
  champion: "workflow pain, what they've tried, adoption fears, training, holdouts",
  procurement: "approval chain, contract terms, vendor risk process, renewal/termination terms",
};

const NEXT_QUESTION_SYSTEM = `You are a voice agent conducting a short (90-second, ~6-8 exchange) information-gathering call
with one stakeholder on a professional-services onboarding deal. This is NOT a negotiation and you are NOT
reading a fixed script — produce exactly ONE next question that naturally follows from what they just said.

Adapt to their actual answers: if they raise a risk, probe it; if they're vague, ask a sharper follow-up; if
they've already covered a topic, move to a new one. Keep questions short, conversational, and specific — not
generic ("tell me about the project") and not multi-part.

Role-tuned focus areas for this call:
{{ROLE_FOCUS}}

If the conversation already has 6 or more exchanges, ask a natural closing question rather than opening a new
topic.`;

app.post(
  "/api/next-question",
  asyncHandler(async (req, res) => {
    const { role, conversationSoFar } = req.body ?? {};
    if (!role) {
      res.status(400).json({ error: "role is required" });
      return;
    }

    const focus = ROLE_BANKS[role] ?? ROLE_BANKS.sponsor;
    const system = NEXT_QUESTION_SYSTEM.replace("{{ROLE_FOCUS}}", focus);

    const transcriptText = Array.isArray(conversationSoFar)
      ? conversationSoFar.map((l: { speaker: string; text: string }) => `${l.speaker}: ${l.text}`).join("\n")
      : (conversationSoFar ?? "(call just started — ask an opening question)");

    const result = await claudeJSON<{ question: string }>({
      system,
      user: `Conversation so far:\n${transcriptText}`,
      schema: NEXT_QUESTION_SCHEMA,
      effort: "low",
      maxTokens: 256,
    });

    res.json(result);
  }),
);

// ---------------------------------------------------------------------------
// (c) Cross-transcript conflict synthesis — THE CRITICAL ONE
// ---------------------------------------------------------------------------

const CONFLICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["conflicts"],
  properties: {
    conflicts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "stakeholderA", "quoteA", "stakeholderB", "quoteB", "severity", "suggestedResolution"],
        properties: {
          category: { type: "string", enum: ["timeline", "successCriteria", "authority", "assumption", "political"] },
          stakeholderA: { type: "string" },
          quoteA: { type: "string" },
          stakeholderB: { type: "string" },
          quoteB: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          suggestedResolution: { type: "string" },
        },
      },
    },
  },
};

// This prompt is the single most important component in the system (per BUILD_BRIEF.md / CURSOR_INSTRUCTIONS.md
// section 5c) — kept isolated so it can be iterated against the seeded Anya/Tom transcripts without touching
// extraction, doc-gen, or voice.
const CONFLICT_SYSTEM = `You are analyzing call transcripts from MULTIPLE stakeholders on the SAME professional-services
onboarding deal. Each stakeholder was interviewed separately and does not know what the others said. Your job is
to find places where they silently disagree — contradictions that would blow up at kickoff if nobody caught them
first.

Find SPECIFIC, factual contradictions only. Each one must be something a project manager could point to and say
"these two people are not on the same page." Do not report generic observations, vague tension, or things that
are merely "worth discussing." If two stakeholders are simply talking about different topics, that is not a
conflict.

For each conflict:
- quoteA and quoteB must be VERBATIM substrings lifted directly from the transcripts — do not paraphrase,
  combine sentences, or clean up grammar. If you cannot find a verbatim quote that supports the contradiction,
  do not report it.
- stakeholderA / stakeholderB are the person's name as it appears in the transcript header (e.g. "Anya Müller"),
  not their role alone.
- category:
  - timeline: incompatible dates, durations, or deadlines (e.g. one says weeks, another says quarters)
  - successCriteria: incompatible definitions of "done" or "success"
  - authority: incompatible claims about who can approve, sign off, or decide
  - assumption: one stakeholder's confident assumption is directly contradicted by another's stated experience or concern
  - political: incompatible claims about relationships, trust, or how decisions actually get made
- severity: "high" if it would derail or visibly embarrass someone at a live kickoff call if surfaced cold;
  "medium" if it needs reconciling but is low-drama; "low" if it's a minor wording mismatch.
- suggestedResolution: one concrete sentence a PM could literally say or do at kickoff to defuse this specific
  conflict — not generic advice like "align stakeholders."

Order conflicts by severity, highest first. If you genuinely find no contradictions, return an empty array —
never invent one to have something to show.`;

app.post(
  "/api/conflict-map",
  asyncHandler(async (req, res) => {
    const { dealProfileId } = req.body ?? {};
    if (!dealProfileId) {
      res.status(400).json({ error: "dealProfileId is required" });
      return;
    }

    const profile = store.getDealProfile(dealProfileId);
    if (!profile) {
      res.status(404).json({ error: "Deal profile not found" });
      return;
    }

    const calls = store
      .listCallsForProfile(dealProfileId)
      .filter((c) => c.status === "completed" && c.transcript);

    if (calls.length < 2) {
      res.status(400).json({
        error: "Need at least 2 completed transcripts to synthesize a conflict map",
        completedCalls: calls.length,
      });
      return;
    }

    const stakeholderById = new Map(profile.stakeholders.map((s) => [s.id, s]));
    const transcriptBlock = calls
      .map((c) => {
        const sh = stakeholderById.get(c.stakeholderId);
        const name = sh?.name ?? c.stakeholderId;
        const role = sh?.role ?? c.role;
        return `### ${name} (${role})\n${c.transcript}`;
      })
      .join("\n\n");

    const result = await claudeJSON<{ conflicts: Conflict[] }>({
      system: CONFLICT_SYSTEM,
      user: `Here are the transcripts:\n\n${transcriptBlock}`,
      schema: CONFLICT_SCHEMA,
      effort: "high",
      maxTokens: 4096,
    });

    const row = store.insertConflictMap(dealProfileId, result.conflicts);
    res.json(row);
  }),
);

// ---------------------------------------------------------------------------
// Post-call document generation
// ---------------------------------------------------------------------------

const GENERATE_DOC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "fields", "flaggedBlanks"],
  properties: {
    title: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "fillType"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          fillType: { type: "string", enum: ["direct", "derived", "conditional", "flaggedBlank"] },
        },
      },
    },
    flaggedBlanks: { type: "array", items: { type: "string" } },
  },
};

const GENERATE_DOC_SYSTEM = `You turn a single stakeholder call transcript into a structured "Requirements Summary" document.
Extract concrete bullet-point facts the stakeholder actually stated — each as a {label, value} pair (e.g.
{label: "Desired go-live", value: "Within 6 weeks (board visibility)"}). Do not editorialize or add advice.
For each field, classify how it was filled via fillType: "direct" (stated verbatim), "derived"
(computed/summarized from what they said), "conditional" (only applies given some condition they mentioned),
or "flaggedBlank" (the call didn't cover it but it's expected for this role — list it in flaggedBlanks too,
with value "Not discussed on this call"). Never guess a fact that wasn't said.`;

async function generateDocForCall(callId: string): Promise<GeneratedDocument> {
  const call = store.getCall(callId);
  if (!call) throw new Error(`Call ${callId} not found`);
  if (!call.transcript) throw new Error("Call has no transcript yet");

  const profile = store.getDealProfile(call.dealProfileId);
  const stakeholder = profile?.stakeholders.find((s) => s.id === call.stakeholderId);
  const name = stakeholder?.name ?? call.stakeholderId;

  const doc = await claudeJSON<{
    title: string;
    fields: Array<{ label: string; value: string; fillType: string }>;
    flaggedBlanks: string[];
  }>({
    system: GENERATE_DOC_SYSTEM,
    user: `Stakeholder: ${name} (role: ${call.role})\n\nTranscript:\n${call.transcript}`,
    schema: GENERATE_DOC_SCHEMA,
    effort: "medium",
  });

  const fieldsObject = Object.fromEntries(doc.fields.map((f) => [f.label, f.value]));
  const fillTypesObject = Object.fromEntries(doc.fields.map((f) => [f.label, f.fillType]));

  const generatedDoc = store.insertGeneratedDocument({
    dealProfileId: call.dealProfileId,
    type: "requirementsSummary",
    fields: { title: doc.title, ...fieldsObject },
    fillTypes: fillTypesObject,
    flaggedBlanks: doc.flaggedBlanks,
  });

  store.updateCall(callId, { generatedDocId: generatedDoc.id, extractedData: fieldsObject });

  return generatedDoc;
}

app.post(
  "/api/generate-doc",
  asyncHandler(async (req, res) => {
    const { callId } = req.body ?? {};
    if (!callId) {
      res.status(400).json({ error: "callId is required" });
      return;
    }
    const doc = await generateDocForCall(callId);
    res.json(doc);
  }),
);

// ---------------------------------------------------------------------------
// Kickoff packet
// ---------------------------------------------------------------------------

const KICKOFF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["executiveSummary", "stakeholderMap", "riskRegister", "hiddenLandmines", "agenda", "questionsToAskLive"],
  properties: {
    executiveSummary: { type: "string" },
    stakeholderMap: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "role", "disposition", "tone"],
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          disposition: { type: "string" },
          tone: { type: "string", enum: ["positive", "warning", "neutral"] },
        },
      },
    },
    riskRegister: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "severity", "mitigation"],
        properties: {
          risk: { type: "string" },
          severity: { type: "string", enum: ["High", "Medium", "Low"] },
          mitigation: { type: "string" },
        },
      },
    },
    hiddenLandmines: { type: "array", items: { type: "string" } },
    agenda: { type: "array", items: { type: "string" } },
    questionsToAskLive: { type: "array", items: { type: "string" } },
  },
};

const KICKOFF_SYSTEM = `You synthesize a pre-kickoff briefing packet for a professional-services project manager, from a
deal profile and a cross-stakeholder conflict map. Be concrete and specific — every item must be grounded in
the actual deal data and conflicts given, never generic project-management advice.
- executiveSummary: 2-4 sentences a PM could read in 20 seconds to be briefed.
- stakeholderMap: one entry per stakeholder with a short, specific disposition (e.g. "pushing for speed",
  "skeptical on timeline, key technical risk owner") and a tone reflecting how aligned/at-risk they are.
- riskRegister: derive directly from the conflicts and deal profile — do not invent generic risks.
- hiddenLandmines: PM-eyes-only observations that would be awkward to raise live without preparation (e.g.
  a stakeholder who feels excluded, a billing inconsistency) — phrased as a heads-up to the PM, not the team.
- agenda: 4-6 short items with rough time allocations (e.g. "Technical risk review (integration spike) — 20 min").
- questionsToAskLive: 2-4 sharp questions the PM should ask out loud at kickoff to surface or resolve the
  conflicts before they cause damage later.`;

app.post(
  "/api/kickoff-packet",
  asyncHandler(async (req, res) => {
    const { dealProfileId } = req.body ?? {};
    if (!dealProfileId) {
      res.status(400).json({ error: "dealProfileId is required" });
      return;
    }

    const profile = store.getDealProfile(dealProfileId);
    if (!profile) {
      res.status(404).json({ error: "Deal profile not found" });
      return;
    }

    const conflictMap = store.latestConflictMap(dealProfileId);

    const packet = await claudeJSON<{
      executiveSummary: string;
      stakeholderMap: KickoffPacket["stakeholderMap"];
      riskRegister: KickoffPacket["riskRegister"];
      hiddenLandmines: string[];
      agenda: string[];
      questionsToAskLive: string[];
    }>({
      system: KICKOFF_SYSTEM,
      user: `Deal profile:\n${JSON.stringify(profile, null, 2)}\n\nConflict map:\n${
        JSON.stringify(conflictMap?.conflicts ?? [], null, 2)
      }`,
      schema: KICKOFF_SCHEMA,
      effort: "high",
      maxTokens: 4096,
    });

    const row = store.insertKickoffPacket({
      dealProfileId,
      executiveSummary: packet.executiveSummary,
      stakeholderMap: packet.stakeholderMap,
      successReconciliation: {},
      riskRegister: packet.riskRegister,
      hiddenLandmines: packet.hiddenLandmines,
      agenda: packet.agenda,
      questionsToAskLive: packet.questionsToAskLive,
    });

    res.json(row);
  }),
);

// ---------------------------------------------------------------------------
// Voice: start-call (ElevenLabs signed URL) + call-webhook (post-call transcript)
// ---------------------------------------------------------------------------

app.post(
  "/api/start-call",
  asyncHandler(async (req, res) => {
    const { dealProfileId, stakeholderId } = req.body ?? {};
    if (!dealProfileId || !stakeholderId) {
      res.status(400).json({ error: "dealProfileId and stakeholderId are required" });
      return;
    }

    const profile = store.getDealProfile(dealProfileId);
    if (!profile) {
      res.status(404).json({ error: "Deal profile not found" });
      return;
    }
    const stakeholder = profile.stakeholders.find((s) => s.id === stakeholderId);
    if (!stakeholder) {
      res.status(404).json({ error: `Unknown stakeholder ${stakeholderId} on this deal` });
      return;
    }

    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!agentId || !apiKey) {
      res.status(500).json({ error: "ELEVENLABS_AGENT_ID / ELEVENLABS_API_KEY not configured" });
      return;
    }

    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!signedUrlRes.ok) {
      const text = await signedUrlRes.text();
      throw new Error(`ElevenLabs signed-url request failed (${signedUrlRes.status}): ${text}`);
    }
    const { signed_url } = (await signedUrlRes.json()) as { signed_url: string };

    const call = store.upsertCall(dealProfileId, stakeholderId, stakeholder.role, { status: "inProgress" });

    res.json({
      signedUrl: signed_url,
      callId: call.id,
      dynamicVariables: {
        stakeholder_id: stakeholderId,
        stakeholder_name: stakeholder.name,
        role: stakeholder.role,
        deal_profile_id: dealProfileId,
      },
    });
  }),
);

/**
 * Receives ElevenLabs' post-call webhook, stores the transcript on the matching stakeholder_call
 * row, and triggers generate-doc so "a call becomes a document" happens with no manual step.
 *
 * NOTE: ElevenLabs' exact webhook payload shape is logged below so it can be confirmed against a
 * real delivery on build day — dynamic variables are read defensively from a few likely locations.
 */
app.post(
  "/api/call-webhook",
  asyncHandler(async (req, res) => {
    console.log("ElevenLabs webhook payload:", JSON.stringify(req.body));

    const payload = (req.body ?? {}) as Record<string, unknown>;
    const data = (payload.data ?? payload) as Record<string, unknown>;

    const dynamicVariables =
      (data.conversation_initiation_client_data as Record<string, unknown> | undefined)?.dynamic_variables ??
      (data.dynamic_variables as Record<string, unknown> | undefined) ??
      {};

    const dealProfileId = (dynamicVariables as Record<string, string>).deal_profile_id;
    const stakeholderId = (dynamicVariables as Record<string, string>).stakeholder_id;

    if (!dealProfileId || !stakeholderId) {
      console.error("Webhook payload missing deal_profile_id/stakeholder_id dynamic variables", dynamicVariables);
      res.status(400).json({ error: "Missing dynamic variables on webhook payload", payload });
      return;
    }

    const transcriptTurns = (data.transcript as Array<{ role: string; message: string }> | undefined) ?? [];
    const transcriptText = transcriptTurns
      .map((t) => `${t.role === "agent" ? "Agent" : "Stakeholder"}: ${t.message}`)
      .join("\n");

    const existing = store.findCall(dealProfileId, stakeholderId);
    if (!existing) {
      res.status(404).json({ error: "No matching stakeholder_call row for this deal/stakeholder" });
      return;
    }
    store.updateCall(existing.id, { status: "completed", transcript: transcriptText || existing.transcript });

    if (transcriptText) {
      generateDocForCall(existing.id).catch((e) => console.error("generate-doc trigger failed:", e));
    }

    res.json({ ok: true, callId: existing.id });
  }),
);

app.listen(PORT, () => {
  console.log(`PreKick API listening on http://localhost:${PORT}`);
});
