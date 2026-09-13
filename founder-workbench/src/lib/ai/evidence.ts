import "server-only";
import { structuredCall } from "./client";
import { renderProfile, HOUSE_RULES } from "./context";

// Two jobs at the evidence stage: write the interview questions (AI does NOT
// answer them), and check whether a logged finding actually tests the claimed
// assumption.

export interface InterviewQuestions {
  questions: string[];
  avoid: string[]; // leading/biasing questions to steer clear of
}

const questionsSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: { type: "string" },
      description:
        "Open, non-leading questions that surface past behavior and real spending, not opinions about the idea.",
    },
    avoid: {
      type: "array",
      items: { type: "string" },
      description: "Leading or hypothetical questions the founder should NOT ask, with why.",
    },
  },
  required: ["questions", "avoid"],
} as const;

export async function writeInterviewQuestions(input: {
  profile: Parameters<typeof renderProfile>[0];
  title: string;
  oneLiner: string;
  assumption: string;
}): Promise<InterviewQuestions> {
  const system = `You write customer-interview questions to test one assumption. You never answer them and never predict what customers will say — the founder must gather that evidence in the real world.

FOUNDER CONSTRAINTS:
${renderProfile(input.profile)}

${HOUSE_RULES}

Good questions ask about specific past behavior and real money spent. Bad questions ask "would you use this?" or pitch the idea.`;

  const user = `Idea: ${input.title} — ${input.oneLiner}
Assumption to test in conversations: ${input.assumption}

Write the interview questions.`;

  return structuredCall<InterviewQuestions>({
    system,
    user,
    toolName: "write_interview_questions",
    toolDescription: "Return interview questions to test the assumption, plus questions to avoid.",
    schema: questionsSchema,
    maxTokens: 1200,
  });
}

// ---- Finding-vs-assumption check ------------------------------------------

export interface FindingCheck {
  actuallyTests: boolean;
  verdictSuggestion: "SUPPORTS" | "CONTRADICTS" | "INCONCLUSIVE";
  critique: string; // blunt: e.g. "'my friend said it sounds cool' does not test a pricing assumption"
}

const checkSchema = {
  type: "object",
  properties: {
    actuallyTests: {
      type: "boolean",
      description: "Does this finding genuinely bear on the claimed assumption?",
    },
    verdictSuggestion: {
      type: "string",
      enum: ["SUPPORTS", "CONTRADICTS", "INCONCLUSIVE"],
    },
    critique: {
      type: "string",
      description:
        "One or two blunt sentences. If the finding does not test the assumption, say exactly why.",
    },
  },
  required: ["actuallyTests", "verdictSuggestion", "critique"],
} as const;

export async function checkFinding(input: {
  profile: Parameters<typeof renderProfile>[0];
  assumption: string;
  claimTested: string;
  finding: string;
  type: string;
}): Promise<FindingCheck> {
  const system = `You audit whether a piece of logged evidence actually tests the assumption it is filed under. You are skeptical and blunt. A friend saying "sounds cool" does not test a willingness-to-pay assumption; a compliment is not evidence of demand.

FOUNDER CONSTRAINTS:
${renderProfile(input.profile)}

${HOUSE_RULES}`;

  const user = `Assumption on file: ${input.assumption || "(none linked)"}
Claim the founder says this evidence tests: ${input.claimTested}
Evidence type: ${input.type}
What happened (founder's words): ${input.finding}

Does this evidence actually test that claim?`;

  return structuredCall<FindingCheck>({
    system,
    user,
    toolName: "check_finding",
    toolDescription: "Judge whether the finding tests the claimed assumption and suggest a verdict.",
    schema: checkSchema,
    maxTokens: 700,
  });
}
