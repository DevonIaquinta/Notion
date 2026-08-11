import "server-only";
import { structuredCall } from "./client";
import { renderProfile, HOUSE_RULES } from "./context";

// Generates NO MORE THAN FIVE ideas, each explicitly derived from the profile,
// each with a reason it fits THIS founder. Generic output is rejected by the
// prompt contract.

export interface GeneratedIdea {
  title: string;
  oneLiner: string;
  fitReason: string; // why THIS founder, referencing their constraints
  firstProof: string; // the cheapest first test of demand
}
export interface IdeaGeneration {
  ideas: GeneratedIdea[];
}

const schema = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          oneLiner: { type: "string", description: "One sentence: who it's for and what it does." },
          fitReason: {
            type: "string",
            description:
              "Why THIS founder specifically — cite their access assets, tolerance, capital, or time by value. If it would fit anyone, it does not belong here.",
          },
          firstProof: {
            type: "string",
            description: "The single cheapest way to test whether anyone will pay.",
          },
        },
        required: ["title", "oneLiner", "fitReason", "firstProof"],
      },
    },
  },
  required: ["ideas"],
} as const;

export async function generateIdeas(input: {
  profile: Parameters<typeof renderProfile>[0];
  steer?: string;
}): Promise<IdeaGeneration> {
  const system = `You generate a SMALL number of tightly-constrained business ideas — never a firehose. At most five. Every idea must be derived from this specific founder's constraints and unfit for a generic list.

FOUNDER CONSTRAINTS:
${renderProfile(input.profile)}

${HOUSE_RULES}

Hard rule: if an idea could appear on any generic "side business ideas" listicle, do not include it. Lean on their access assets and tolerance profile — those are what make an idea theirs and not everyone's. Respect every hard exclusion absolutely.`;

  const user = input.steer?.trim()
    ? `The founder adds this direction: ${input.steer.trim()}\n\nGenerate the constrained ideas.`
    : `Generate the constrained ideas.`;

  return structuredCall<IdeaGeneration>({
    system,
    user,
    toolName: "propose_ideas",
    toolDescription: "Propose up to five constraint-derived business ideas.",
    schema,
    maxTokens: 1800,
  });
}
