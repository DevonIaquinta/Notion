import { asStringArray } from "@/lib/types";

// Renders a ConstraintProfile into a compact block every stage prompt embeds,
// so the model can (and is required to) reference the user's real constraints
// by value rather than emitting generic advice.
export function renderProfile(profile: {
  capitalAvailable: number;
  hoursPerWeek: number;
  monthsUntilRevenueNeeded: number;
  riskTolerance: string;
  accessAssets: unknown;
  toleranceProfile: unknown;
  hardExclusions: unknown;
}): string {
  const access = asStringArray(profile.accessAssets);
  const tolerance = asStringArray(profile.toleranceProfile);
  const exclusions = asStringArray(profile.hardExclusions);
  return [
    `Capital available: $${profile.capitalAvailable.toLocaleString()}`,
    `Time: ${profile.hoursPerWeek} hours/week`,
    `Runway: needs revenue within ${profile.monthsUntilRevenueNeeded} months`,
    `Risk tolerance: ${profile.riskTolerance}`,
    `Access assets (people/industries/credentials already held): ${access.length ? access.join("; ") : "none stated"}`,
    `Tolerance profile (unpleasant work they mind less than most): ${tolerance.length ? tolerance.join("; ") : "none stated"}`,
    `Hard exclusions (never propose these): ${exclusions.length ? exclusions.join("; ") : "none"}`,
  ].join("\n");
}

export const HOUSE_RULES = `You are a component inside a structured decision tool, not a chatbot.
- Be specific to the founder's constraints above. Reference their actual numbers and assets by value.
- Push back. If something is vague, unfalsifiable, or mis-filed, say so plainly.
- Never hedge with both-sides output. Make a call and give the reasoning.
- Do not introduce a brand-new business idea when the founder is mid-work on an existing one.
- Return only the structured fields requested. No preamble, no chat.`;
