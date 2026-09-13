import "server-only";
import { structuredCall } from "./client";

// After three kills, surface what the abandoned ideas had in common. This is
// the graveyard's payoff: patterns across a scanner's discard pile.

export interface GraveyardPatterns {
  patterns: { pattern: string; evidence: string }[];
  bluntTakeaway: string;
}

const schema = {
  type: "object",
  properties: {
    patterns: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "A recurring theme across the killed ideas." },
          evidence: { type: "string", description: "Which kills show it, quoting the reasons." },
        },
        required: ["pattern", "evidence"],
      },
    },
    bluntTakeaway: {
      type: "string",
      description:
        "One direct sentence about what this founder should change — a filter to add before the next idea, or a habit to break.",
    },
  },
  required: ["patterns", "bluntTakeaway"],
} as const;

export async function findGraveyardPatterns(input: {
  kills: { title: string; oneLiner: string; killReason: string; killedAtStage: string }[];
}): Promise<GraveyardPatterns> {
  const system = `You analyze a founder's graveyard of abandoned business ideas to surface patterns. You are direct and useful, not consoling. The goal is a sharper filter for the next idea, not encouragement.`;

  const user = `Killed ventures:\n${input.kills
    .map(
      (k, i) =>
        `${i + 1}. "${k.title}" — ${k.oneLiner}\n   Killed at stage ${k.killedAtStage}. Reason: ${k.killReason}`,
    )
    .join("\n")}\n\nWhat do these have in common, and what should change?`;

  return structuredCall<GraveyardPatterns>({
    system,
    user,
    toolName: "record_patterns",
    toolDescription: "Record cross-venture patterns and one blunt takeaway.",
    schema,
    maxTokens: 1200,
  });
}
