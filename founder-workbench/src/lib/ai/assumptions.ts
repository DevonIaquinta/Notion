import "server-only";
import { structuredCall } from "./client";
import { renderProfile, HOUSE_RULES } from "./context";

export interface ProposedAssumption {
  statement: string;
  riskLevel: "FATAL" | "SERIOUS" | "MINOR";
  why: string;
}
export interface AssumptionProposal {
  assumptions: ProposedAssumption[];
  riskiestUntested: string;
}

const schema = {
  type: "object",
  properties: {
    assumptions: {
      type: "array",
      minItems: 4,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          statement: {
            type: "string",
            description:
              "One assumption the idea depends on, phrased as a claim that could be true or false.",
          },
          riskLevel: {
            type: "string",
            enum: ["FATAL", "SERIOUS", "MINOR"],
            description: "FATAL = idea is dead if this is false. Reserve it for genuine dealbreakers.",
          },
          why: {
            type: "string",
            description: "One sentence: why this risk level, tied to the founder's constraints.",
          },
        },
        required: ["statement", "riskLevel", "why"],
      },
    },
    riskiestUntested: {
      type: "string",
      description:
        "The single assumption that most deserves the founder's next hour of evidence-gathering.",
    },
  },
  required: ["assumptions", "riskiestUntested"],
} as const;

export async function proposeAssumptions(input: {
  profile: Parameters<typeof renderProfile>[0];
  title: string;
  oneLiner: string;
}): Promise<AssumptionProposal> {
  const system = `You decompose a business idea into its load-bearing assumptions and rank each by how fatal it is if false.

FOUNDER CONSTRAINTS:
${renderProfile(input.profile)}

${HOUSE_RULES}

Rank honestly. Most ideas have only one or two truly FATAL assumptions; do not inflate. A FATAL assumption is one where, if it turns out false, no amount of execution saves the idea.`;

  const user = `Idea: ${input.title}
One-liner: ${input.oneLiner}

Decompose this into assumptions, rank them, and name the single riskiest untested one.`;

  return structuredCall<AssumptionProposal>({
    system,
    user,
    toolName: "record_assumptions",
    toolDescription: "Record the ranked assumption map for this venture.",
    schema,
    maxTokens: 1800,
  });
}
