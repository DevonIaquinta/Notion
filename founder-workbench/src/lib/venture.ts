import { prisma } from "@/lib/prisma";
import type { VentureSnapshot } from "@/lib/stages";
import { isVentureStage } from "@/lib/stages";
import type { RiskLevel, AssumptionStatus, VentureStatus } from "@/lib/types";

// A venture with everything the case-file view and the gates need.
export async function loadVenture(userId: string, ventureId: string) {
  return prisma.venture.findFirst({
    where: { id: ventureId, userId },
    include: {
      killCriteria: { orderBy: { createdAt: "asc" } },
      assumptions: {
        orderBy: [{ createdAt: "asc" }],
        include: { evidence: true },
      },
      evidence: { orderBy: { createdAt: "desc" }, include: { assumption: true } },
      decisionLog: { orderBy: { createdAt: "desc" } },
      offer: true,
    },
  });
}

export type LoadedVenture = NonNullable<Awaited<ReturnType<typeof loadVenture>>>;

export function offerComplete(offer: LoadedVenture["offer"]): boolean {
  if (!offer) return false;
  return [
    offer.whoItsFor,
    offer.problemSolved,
    offer.deliverable,
    offer.price,
    offer.guarantee,
  ].every((f) => typeof f === "string" && f.trim().length > 0);
}

export function buildSnapshot(v: LoadedVenture): VentureSnapshot {
  const namedConversationCount = v.evidence.filter(
    (e) => e.type === "CONVERSATION" && e.source.trim().length > 0,
  ).length;

  return {
    status: v.status as VentureStatus,
    currentStage: isVentureStage(v.currentStage) ? v.currentStage : "KILL_CRITERIA",
    killCriteriaCount: v.killCriteria.length,
    falsifiableKillCriteriaCount: v.killCriteria.filter((k) => k.isFalsifiable).length,
    assumptions: v.assumptions.map((a) => ({
      riskLevel: a.riskLevel as RiskLevel,
      status: a.status as AssumptionStatus,
    })),
    namedConversationCount,
    totalEvidenceCount: v.evidence.length,
    priceTestCount: v.evidence.filter((e) => e.type === "PRICE_TEST").length,
    offerComplete: offerComplete(v.offer),
  };
}

// The one active venture for the home view (most recently touched).
export async function activeVenture(userId: string) {
  return prisma.venture.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
}
