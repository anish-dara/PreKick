import { HydraDBClient, HydraDBError } from "@hydradb/sdk";
import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// HydraDB memory layer.
//
// Design decision (the wedge): memory is keyed on the PERSON, not the project.
//   tenant_id     = the whole PreKick app ("prekick")
//   sub_tenant_id = a stable per-stakeholder slug (stakeholderKey)
// Each completed interview is one HydraDB memory record (type:"memory").
// Recall = client.query({ type:"memory", subTenantId }). The existing in-memory
// store still owns deal profiles / calls / conflict maps; HydraDB owns only the
// durable per-stakeholder interview history.
// ---------------------------------------------------------------------------

const TENANT_ID = process.env.HYDRA_TENANT_ID ?? "prekick";

// ---- Memory Log event bus (consumed by the SSE route in index.ts) -----------
export type MemoryLogEvent = {
  ts: string; // ISO timestamp
  op: "READ" | "WRITE" | "INFO";
  stakeholder?: string;
  subTenantId?: string;
  detail: string;
};

export const memoryLog = new EventEmitter();
const RING: MemoryLogEvent[] = [];

export function recentMemoryLog(): MemoryLogEvent[] {
  return RING.slice(-50);
}

export function logMemory(e: Omit<MemoryLogEvent, "ts">) {
  const evt: MemoryLogEvent = { ...e, ts: new Date().toISOString() };
  RING.push(evt);
  if (RING.length > 200) RING.shift();
  memoryLog.emit("event", evt);
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

/** Deterministic per-person key so the same human maps to the same sub_tenant across projects. */
export function stakeholderKey(name: string, email?: string | null): string {
  const basis = email && email.trim() ? email.split("@")[0] : name;
  return basis
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- One-time tenant provisioning ------------------------------------------
let tenantReady: Promise<void> | null = null;

export function ensureTenant(): Promise<void> {
  if (!tenantReady) {
    tenantReady = provision().catch((e) => {
      // Allow a retry on the next call (e.g. transient error, key added later).
      tenantReady = null;
      throw e;
    });
  }
  return tenantReady;
}

async function provision(): Promise<void> {
  const c = getClient();
  try {
    await c.tenants.create({ tenantId: TENANT_ID });
    logMemory({ op: "INFO", detail: `HydraDB tenant "${TENANT_ID}" create requested` });
  } catch (err) {
    // "Already exists" is fine; anything else we log but still poll for readiness.
    const code =
      err instanceof HydraDBError
        ? (err.body as { error?: { code?: string } } | undefined)?.error?.code
        : undefined;
    if (code && !/EXIST|CONFLICT/i.test(String(code))) {
      console.warn("HydraDB tenants.create warning:", code);
    }
  }

  // Poll until the tenant is actually ready to accept ingestion. The authoritative
  // signal is infra.ready_for_ingestion (snake_case on the wire; not in the typed
  // interface, and vectorstoreStatus.memories flips true prematurely — don't trust it).
  for (let i = 0; i < 60; i++) {
    try {
      const res = await c.tenants.status({ tenantId: TENANT_ID });
      const infra = res.data?.infra as { ready_for_ingestion?: boolean } | undefined;
      if (infra?.ready_for_ingestion) {
        logMemory({ op: "INFO", detail: `HydraDB tenant "${TENANT_ID}" ready for ingestion` });
        return;
      }
    } catch (err) {
      // tenant may not be queryable for a moment right after create — keep polling
    }
    await sleep(5_000);
  }
  // Don't hard-fail boot; ingestion/query will surface a clear error if truly not ready.
  logMemory({ op: "INFO", detail: `HydraDB tenant "${TENANT_ID}" readiness not confirmed — continuing` });
}

// ---- Write one interview (autonomous write) --------------------------------
export type InterviewWrite = {
  name: string;
  email?: string | null;
  role: string;
  projectId: string;
  customer: string;
  transcript: string;
  concerns: string[];
  date?: string; // ISO; defaults to now
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

  const id = res.data?.results?.[0]?.id ?? "unknown";
  logMemory({
    op: "WRITE",
    stakeholder: w.name,
    subTenantId,
    detail: `stakeholder=${w.name}, interview_id=${id}, concerns=${w.concerns.length}`,
  });

  // Best-effort: wait for indexing so an immediate read finds it (don't block forever).
  if (id !== "unknown") pollIndexed(id).catch(() => {});
  return { id, subTenantId };
}

// ---- Read a person's prior history (autonomous recall) ---------------------
export type PriorInterview = {
  text: string;
  metadata?: Record<string, unknown>;
  additionalMetadata?: Record<string, unknown>;
};

export async function lookupHistory(opts: {
  name: string;
  email?: string | null;
  query?: string;
}): Promise<PriorInterview[]> {
  const subTenantId = stakeholderKey(opts.name, opts.email);

  let interviews: PriorInterview[] = [];
  try {
    await ensureTenant();
    const c = getClient();
    const res = await c.query({
      tenantId: TENANT_ID,
      subTenantId,
      type: "memory",
      query: opts.query ?? `Prior conversation history and concerns for ${opts.name}`,
      mode: "thinking",
      recencyBias: 0.6,
      // Pull the PERSON's full accumulated history, not just the single best match —
      // every past call should feed the analyzer so context compounds over time.
      maxResults: 25,
    });
    interviews = (res.data?.chunks ?? []).map((ch) => ({
      text: ch.chunkContent ?? "",
      metadata: ch.metadata,
      additionalMetadata: ch.additionalMetadata,
    }));

    // De-dupe identical retrieval chunks and order most-recent-first so the
    // analyzer reads the trajectory (oldest concern → latest) coherently.
    const seen = new Set<string>();
    interviews = interviews
      .filter((iv) => {
        const key = iv.text.trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const da = String(a.additionalMetadata?.date ?? "");
        const db = String(b.additionalMetadata?.date ?? "");
        return db.localeCompare(da);
      });
  } catch (err) {
    // No prior memory / brand-new person is a normal case — return empty, still log the read.
    interviews = [];
  }

  logMemory({
    op: "READ",
    stakeholder: opts.name,
    subTenantId,
    detail: `stakeholder=${opts.name} → ${interviews.length} prior interview${interviews.length === 1 ? "" : "s"} retrieved`,
  });
  return interviews;
}

/** Render retrieved interviews into a single string for the agent / synthesis prompt. */
export function formatPriorHistory(chunks: PriorInterview[]): string {
  if (!chunks.length) return "";
  const header = `(${chunks.length} prior interview${chunks.length === 1 ? "" : "s"} on record, most recent first — use the full arc to judge whether each concern is resolving, persisting, or escalating)`;
  const body = chunks
    .map((ch, i) => `Prior interview ${i + 1} of ${chunks.length}:\n${ch.text}`)
    .join("\n\n---\n\n");
  return `${header}\n\n${body}`;
}

// ---- helpers ---------------------------------------------------------------
async function pollIndexed(id: string): Promise<void> {
  const c = getClient();
  for (let i = 0; i < 30; i++) {
    const res = await c.context.status({ tenantId: TENANT_ID, ids: [id] });
    const status = res.data?.statuses?.[0];
    const s = status?.indexingStatus;
    if (s === "completed" || s === "graph_creation") return;
    if (s === "errored" || s === "failed") {
      throw new Error(status?.errorMessage ?? "indexing errored");
    }
    await sleep(2_000);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
