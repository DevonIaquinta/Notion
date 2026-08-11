// The stage machine. Gates are hard-coded here and enforced in server actions
// (src/server/*). Advancing is never a matter of clicking "next" — every gate
// is computed from persisted evidence.

import type { RiskLevel, AssumptionStatus, VentureStatus } from "./types";

// The five venture stages. (Stage 1 Constraints and Stage 2 Idea intake are
// handled before a venture reaches this machine: constraints are user-level,
// and intake's gate is simply "a venture exists and is ACTIVE".)
export const VENTURE_STAGES = [
  "KILL_CRITERIA",
  "ASSUMPTION_MAPPING",
  "EVIDENCE",
  "OFFER",
  "FIRST_DOLLAR",
] as const;
export type VentureStage = (typeof VENTURE_STAGES)[number];

export function isVentureStage(v: string): v is VentureStage {
  return (VENTURE_STAGES as readonly string[]).includes(v);
}

// Human-facing metadata. Numbers match the spec's 1–7 stage list.
export const STAGE_META: Record<
  VentureStage,
  { number: number; label: string; blurb: string }
> = {
  KILL_CRITERIA: {
    number: 3,
    label: "Kill criteria",
    blurb:
      "Write the conditions that would make you walk away — before you research, so sunk cost can't rewrite them later.",
  },
  ASSUMPTION_MAPPING: {
    number: 4,
    label: "Assumption mapping",
    blurb:
      "Break the idea into assumptions and rank them by how fatal each is if false. The riskiest untested one is your next move.",
  },
  EVIDENCE: {
    number: 5,
    label: "Evidence",
    blurb:
      "Log real-world evidence against your assumptions. This is the gate that matters. Talk to real, named people.",
  },
  OFFER: {
    number: 6,
    label: "Offer",
    blurb:
      "Build one specific offer: who, what problem, what deliverable, what price, what guarantee — then price-test it.",
  },
  FIRST_DOLLAR: {
    number: 7,
    label: "First dollar",
    blurb: "A short checklist to one real transaction. Nothing about scaling.",
  },
};

// ---- Gate evaluation -------------------------------------------------------

// Everything a gate needs, pre-aggregated by the caller from persisted rows.
export interface VentureSnapshot {
  status: VentureStatus;
  currentStage: VentureStage;
  killCriteriaCount: number;
  falsifiableKillCriteriaCount: number;
  assumptions: { riskLevel: RiskLevel; status: AssumptionStatus }[];
  namedConversationCount: number; // CONVERSATION evidence with a non-empty source
  totalEvidenceCount: number;
  priceTestCount: number;
  offerComplete: boolean;
}

export interface GateResult {
  passed: boolean;
  // The rule, stated plainly.
  requirement: string;
  // Where the user stands against it right now.
  progress: string;
  // What's still missing, if anything.
  remaining: string[];
}

export const MIN_KILL_CRITERIA = 3;
export const MIN_CONVERSATIONS = 5;

export function fatalAssumptions(s: VentureSnapshot) {
  return s.assumptions.filter((a) => a.riskLevel === "FATAL");
}

function fatalResolved(s: VentureSnapshot): boolean {
  const fatal = fatalAssumptions(s);
  return (
    fatal.length > 0 &&
    fatal.every((a) => a.status === "SUPPORTED" || a.status === "REFUTED")
  );
}

// Evaluate the gate FOR the given stage: can the venture advance out of it?
export function evaluateGate(stage: VentureStage, s: VentureSnapshot): GateResult {
  switch (stage) {
    case "KILL_CRITERIA": {
      const ok = s.falsifiableKillCriteriaCount >= MIN_KILL_CRITERIA;
      return {
        passed: ok,
        requirement: `At least ${MIN_KILL_CRITERIA} kill criteria, each falsifiable.`,
        progress: `${s.falsifiableKillCriteriaCount} of ${MIN_KILL_CRITERIA} falsifiable criteria written${
          s.killCriteriaCount > s.falsifiableKillCriteriaCount
            ? ` (${s.killCriteriaCount - s.falsifiableKillCriteriaCount} still vague)`
            : ""
        }.`,
        remaining: ok
          ? []
          : [
              `Write ${Math.max(
                0,
                MIN_KILL_CRITERIA - s.falsifiableKillCriteriaCount,
              )} more falsifiable kill criterion(s).`,
            ],
      };
    }

    case "ASSUMPTION_MAPPING": {
      const fatal = fatalAssumptions(s);
      const ok = fatal.length >= 1;
      return {
        passed: ok,
        requirement: "At least one assumption identified as FATAL.",
        progress: `${fatal.length} fatal assumption(s) of ${s.assumptions.length} total.`,
        remaining: ok ? [] : ["Mark the assumption that kills the idea if false as FATAL."],
      };
    }

    case "EVIDENCE": {
      const enough = s.namedConversationCount >= MIN_CONVERSATIONS;
      const resolved = fatalResolved(s);
      const ok = enough && resolved;
      const remaining: string[] = [];
      if (!enough)
        remaining.push(
          `Log ${MIN_CONVERSATIONS - s.namedConversationCount} more conversation(s) with named people.`,
        );
      if (!resolved) {
        const openFatal = fatalAssumptions(s).filter(
          (a) => a.status !== "SUPPORTED" && a.status !== "REFUTED",
        ).length;
        remaining.push(
          openFatal > 0
            ? `Resolve ${openFatal} fatal assumption(s) to SUPPORTED or REFUTED.`
            : "Identify and resolve at least one fatal assumption.",
        );
      }
      return {
        passed: ok,
        requirement: `${MIN_CONVERSATIONS} named conversations logged, and every FATAL assumption supported or refuted.`,
        progress: `${s.namedConversationCount} of ${MIN_CONVERSATIONS} conversations; ${
          resolved ? "all" : "not all"
        } fatal assumptions resolved.`,
        remaining,
      };
    }

    case "OFFER": {
      const ok = s.offerComplete && s.priceTestCount >= 1;
      const remaining: string[] = [];
      if (!s.offerComplete) remaining.push("Complete every field of the offer.");
      if (s.priceTestCount < 1) remaining.push("Log one PRICE_TEST evidence entry.");
      return {
        passed: ok,
        requirement: "A complete offer and one price-test evidence entry.",
        progress: `${s.offerComplete ? "Offer complete" : "Offer incomplete"}; ${s.priceTestCount} price test(s).`,
        remaining,
      };
    }

    case "FIRST_DOLLAR": {
      const ok = s.status === "LAUNCHED";
      return {
        passed: ok,
        requirement: "Mark the venture LAUNCHED once you've taken a first real payment.",
        progress: ok ? "Launched." : "Not yet launched.",
        remaining: ok ? [] : ["Close a first real transaction, then mark launched."],
      };
    }
  }
}

export function nextStage(stage: VentureStage): VentureStage | null {
  const i = VENTURE_STAGES.indexOf(stage);
  if (i < 0 || i >= VENTURE_STAGES.length - 1) return null;
  return VENTURE_STAGES[i + 1];
}

// The home view's single imperative sentence.
export function nextAction(s: VentureSnapshot): string {
  if (s.status === "LAUNCHED") return "You logged a first sale. Write the decision that got you here, or start a new venture.";
  if (s.status === "KILLED") return "This venture is in the graveyard. Open an active one or start something new.";
  if (s.status === "PARKED") return "This venture is parked. Re-activate it or pick another.";

  const gate = evaluateGate(s.currentStage, s);
  if (gate.remaining.length > 0) return gate.remaining[0];

  const next = nextStage(s.currentStage);
  if (next)
    return `Gate cleared. Advance to ${STAGE_META[next].label.toLowerCase()}.`;
  return "Mark the venture launched.";
}
