import "server-only";
import { structuredCall } from "./client";
import { renderProfile, HOUSE_RULES } from "./context";

export interface SharpenedCriterion {
  original: string;
  isFalsifiable: boolean;
  problem: string; // why the original is/isn't falsifiable
  sharpened: string; // a concrete, testable rewrite
}
export interface KillCriteriaReview {
  criteria: SharpenedCriterion[];
}

const schema = {
  type: "object",
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          isFalsifiable: {
            type: "boolean",
            description:
              "True only if the criterion names a concrete threshold or observable event that could clearly be met.",
          },
          problem: {
            type: "string",
            description:
              "If not falsifiable, what makes it vague. If it is, one line confirming what makes it testable.",
          },
          sharpened: {
            type: "string",
            description:
              "A rewrite with a number, count, or observable event — something the founder could unambiguously check.",
          },
        },
        required: ["original", "isFalsifiable", "problem", "sharpened"],
      },
    },
  },
  required: ["criteria"],
} as const;

export async function reviewKillCriteria(input: {
  profile: Parameters<typeof renderProfile>[0];
  title: string;
  oneLiner: string;
  criteria: string[];
}): Promise<KillCriteriaReview> {
  const system = `You sharpen kill criteria into falsifiable form. A kill criterion is a condition that would make the founder walk away. It is worthless unless it names a concrete threshold or observable event.

FOUNDER CONSTRAINTS:
${renderProfile(input.profile)}

${HOUSE_RULES}

Example of the bar: "not enough demand" is NOT falsifiable. "Fewer than 3 of 10 target customers I interview have already paid to solve this" IS. Judge each criterion against that bar and rewrite the weak ones.`;

  const user = `Idea: ${input.title} — ${input.oneLiner}

Kill criteria to review:
${input.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;

  return structuredCall<KillCriteriaReview>({
    system,
    user,
    toolName: "review_kill_criteria",
    toolDescription: "Return a falsifiability judgment and sharpened rewrite for each criterion.",
    schema,
    maxTokens: 1600,
  });
}
