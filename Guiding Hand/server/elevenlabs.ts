// ---------------------------------------------------------------------------
// ElevenLabs Conversations API client.
//
// ElevenLabs stores the transcript of every conversation (browser mic + Twilio
// phone calls). Instead of depending on the post-call webhook (which needs a
// public URL), we can PULL transcripts on demand. Each conversation carries the
// dynamic_variables we injected at call start (deal_profile_id / stakeholder_id),
// so a pulled transcript can be matched back to the right stakeholder.
// ---------------------------------------------------------------------------

const BASE = "https://api.elevenlabs.io";

export type ElevenTranscriptTurn = {
  role: string;
  message: string | null;
  time_in_call_secs?: number;
};

export type ElevenConversationSummary = {
  conversation_id: string;
  status: string; // "initiated" | "in-progress" | "processing" | "done" | "failed"
  direction?: string; // "inbound" | "outbound"
  start_time_unix_secs: number;
  call_duration_secs?: number;
  message_count?: number;
};

export type ElevenConversationDetail = {
  conversation_id: string;
  status: string;
  metadata?: { start_time_unix_secs?: number; call_duration_secs?: number };
  transcript: ElevenTranscriptTurn[];
  conversation_initiation_client_data?: { dynamic_variables?: Record<string, unknown> };
};

function apiKey(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY not configured");
  return k;
}

export async function listConversations(agentId: string, pageSize = 50): Promise<ElevenConversationSummary[]> {
  const url = `${BASE}/v1/convai/conversations?agent_id=${encodeURIComponent(agentId)}&page_size=${pageSize}`;
  const res = await fetch(url, { headers: { "xi-api-key": apiKey() } });
  if (!res.ok) {
    throw new Error(`ElevenLabs list conversations failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { conversations?: ElevenConversationSummary[] };
  return data.conversations ?? [];
}

export async function getConversation(id: string): Promise<ElevenConversationDetail> {
  const res = await fetch(`${BASE}/v1/convai/conversations/${encodeURIComponent(id)}`, {
    headers: { "xi-api-key": apiKey() },
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs get conversation failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as ElevenConversationDetail;
}

/** Render ElevenLabs transcript turns into our "Agent:/Stakeholder:" line format. */
export function turnsToTranscript(turns: ElevenTranscriptTurn[]): string {
  return (turns ?? [])
    .filter((t) => t && typeof t.message === "string" && t.message.trim().length > 0)
    .map((t) => `${t.role === "agent" ? "Agent" : "Stakeholder"}: ${(t.message as string).trim()}`)
    .join("\n");
}
