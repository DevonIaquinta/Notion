import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Server-side only. The key is never sent to the client. Every stage module
// forces a single tool call whose input schema IS the stage's output contract,
// so the model can only return typed, structured data — never a chat bubble.

export class AIUnavailableError extends Error {
  constructor(message = "AI is not configured. Set ANTHROPIC_API_KEY.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AIUnavailableError();
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

type JsonSchema = Record<string, unknown>;

// Run a stage prompt and return the forced tool's typed input.
export async function structuredCall<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: JsonSchema;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: opts.toolName },
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use")
    throw new Error("Model did not return structured output.");
  return block.input as T;
}
