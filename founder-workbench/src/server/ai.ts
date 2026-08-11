"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { AIUnavailableError } from "@/lib/ai/client";
import { generateIdeas, type IdeaGeneration } from "@/lib/ai/ideaIntake";
import { reviewKillCriteria, type KillCriteriaReview } from "@/lib/ai/killCriteria";
import { proposeAssumptions, type AssumptionProposal } from "@/lib/ai/assumptions";
import {
  writeInterviewQuestions,
  checkFinding,
  type InterviewQuestions,
  type FindingCheck,
} from "@/lib/ai/evidence";
import { findGraveyardPatterns, type GraveyardPatterns } from "@/lib/ai/graveyard";

export type AIResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<AIResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AIUnavailableError) return { ok: false, error: e.message };
    console.error("[ai]", e);
    return { ok: false, error: "The assist call failed. Try again in a moment." };
  }
}

async function requireProfile(userId: string) {
  const profile = await prisma.constraintProfile.findUnique({ where: { userId } });
  if (!profile) throw new AIUnavailableError("Define your constraints first.");
  return profile;
}

async function ownedVenture(userId: string, ventureId: string) {
  const v = await prisma.venture.findFirst({
    where: { id: ventureId, userId },
    include: { killCriteria: true, assumptions: true },
  });
  if (!v) throw new Error("Venture not found.");
  return v;
}

export async function generateIdeasAction(steer?: string): Promise<AIResult<IdeaGeneration>> {
  const user = await requireUser();
  return run(async () => {
    const profile = await requireProfile(user.id);
    return generateIdeas({ profile, steer });
  });
}

export async function reviewKillCriteriaAction(
  ventureId: string,
): Promise<AIResult<KillCriteriaReview>> {
  const user = await requireUser();
  return run(async () => {
    const profile = await requireProfile(user.id);
    const v = await ownedVenture(user.id, ventureId);
    const criteria = v.killCriteria.map((k) => k.statement);
    if (criteria.length === 0) throw new Error("Write a criterion first.");
    return reviewKillCriteria({ profile, title: v.title, oneLiner: v.oneLiner, criteria });
  });
}

export async function proposeAssumptionsAction(
  ventureId: string,
): Promise<AIResult<AssumptionProposal>> {
  const user = await requireUser();
  return run(async () => {
    const profile = await requireProfile(user.id);
    const v = await ownedVenture(user.id, ventureId);
    return proposeAssumptions({ profile, title: v.title, oneLiner: v.oneLiner });
  });
}

export async function writeQuestionsAction(
  ventureId: string,
  assumption: string,
): Promise<AIResult<InterviewQuestions>> {
  const user = await requireUser();
  return run(async () => {
    const profile = await requireProfile(user.id);
    const v = await ownedVenture(user.id, ventureId);
    return writeInterviewQuestions({
      profile,
      title: v.title,
      oneLiner: v.oneLiner,
      assumption,
    });
  });
}

export async function checkFindingAction(
  ventureId: string,
  input: { assumption: string; claimTested: string; finding: string; type: string },
): Promise<AIResult<FindingCheck>> {
  const user = await requireUser();
  return run(async () => {
    const profile = await requireProfile(user.id);
    await ownedVenture(user.id, ventureId); // authorize
    return checkFinding({ profile, ...input });
  });
}

export async function graveyardPatternsAction(): Promise<AIResult<GraveyardPatterns>> {
  const user = await requireUser();
  return run(async () => {
    const kills = await prisma.venture.findMany({
      where: { userId: user.id, status: "KILLED" },
      orderBy: { killedAt: "desc" },
    });
    if (kills.length < 3) throw new Error("Patterns unlock after three kills.");
    return findGraveyardPatterns({
      kills: kills.map((k) => ({
        title: k.title,
        oneLiner: k.oneLiner,
        killReason: k.killReason ?? "(no reason recorded)",
        killedAtStage: k.currentStage,
      })),
    });
  });
}
