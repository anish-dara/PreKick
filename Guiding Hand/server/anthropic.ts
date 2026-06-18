import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set — add it to .env");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export type Effort = "low" | "medium" | "high";

/**
 * Calls Claude with a JSON-schema-constrained response and returns the parsed object.
 * Structured outputs avoid the fence-stripping / partial-JSON failure modes of free-text prompting.
 */
export async function claudeJSON<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
}): Promise<T> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: {
      effort: opts.effort ?? "medium",
      format: { type: "json_schema", schema: opts.schema },
    },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return JSON.parse(block.text) as T;
}
