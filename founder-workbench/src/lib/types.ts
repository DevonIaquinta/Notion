// Application-level vocabulary. Because SQLite stores these as plain strings,
// these unions + guards are the single source of truth for valid values, and
// Zod schemas below validate anything crossing a form/action boundary.

import { z } from "zod";

export const VENTURE_STATUS = ["ACTIVE", "PARKED", "KILLED", "LAUNCHED"] as const;
export type VentureStatus = (typeof VENTURE_STATUS)[number];

export const RISK_TOLERANCE = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskTolerance = (typeof RISK_TOLERANCE)[number];

export const EVIDENCE_TYPE = [
  "CONVERSATION",
  "PRICE_TEST",
  "COMPETITOR",
  "PUBLIC_DATA",
  "PREORDER",
  "OTHER",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPE)[number];

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  CONVERSATION: "Conversation",
  PRICE_TEST: "Price test",
  COMPETITOR: "Competitor",
  PUBLIC_DATA: "Public data",
  PREORDER: "Pre-order",
  OTHER: "Other",
};

export const VERDICT = ["SUPPORTS", "CONTRADICTS", "INCONCLUSIVE"] as const;
export type Verdict = (typeof VERDICT)[number];

export const VERDICT_LABEL: Record<Verdict, string> = {
  SUPPORTS: "Supports",
  CONTRADICTS: "Contradicts",
  INCONCLUSIVE: "Inconclusive",
};

export const RISK_LEVEL = ["FATAL", "SERIOUS", "MINOR"] as const;
export type RiskLevel = (typeof RISK_LEVEL)[number];

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  FATAL: "Fatal",
  SERIOUS: "Serious",
  MINOR: "Minor",
};

export const ASSUMPTION_STATUS = [
  "UNTESTED",
  "TESTING",
  "SUPPORTED",
  "REFUTED",
] as const;
export type AssumptionStatus = (typeof ASSUMPTION_STATUS)[number];

export const ASSUMPTION_STATUS_LABEL: Record<AssumptionStatus, string> = {
  UNTESTED: "Untested",
  TESTING: "Testing",
  SUPPORTED: "Supported",
  REFUTED: "Refuted",
};

// ---- Zod schemas used by server actions -----------------------------------

export const zRiskTolerance = z.enum(RISK_TOLERANCE);
export const zEvidenceType = z.enum(EVIDENCE_TYPE);
export const zVerdict = z.enum(VERDICT);
export const zRiskLevel = z.enum(RISK_LEVEL);
export const zAssumptionStatus = z.enum(ASSUMPTION_STATUS);

// Fields stored as Json arrays.
export const zStringArray = z.array(z.string().trim().min(1)).max(50);

// Array-shaped columns are stored as JSON text (SQLite has no array/Json type).
// Decode defensively: accept a real array, a JSON-encoded string, or garbage.
export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      /* fall through */
    }
  }
  return [];
}

export function encodeStringArray(value: string[]): string {
  return JSON.stringify(value);
}
