"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logDecision } from "@/lib/decisions";
import type { ActionResult } from "@/server/ventures";

async function ownedVentureId(userId: string, ventureId: string) {
  const v = await prisma.venture.findFirst({
    where: { id: ventureId, userId },
    select: { id: true, currentStage: true },
  });
  if (!v) throw new Error("Venture not found.");
  return v;
}

async function assertOwnsCriterion(userId: string, criterionId: string) {
  const k = await prisma.killCriterion.findFirst({
    where: { id: criterionId, venture: { userId } },
    include: { venture: { select: { id: true, currentStage: true } } },
  });
  if (!k) throw new Error("Criterion not found.");
  return k;
}

const zAdd = z.object({
  statement: z.string().trim().min(6).max(400),
  isFalsifiable: z.boolean().optional(),
});

export async function addKillCriterion(
  ventureId: string,
  input: { statement: string; isFalsifiable?: boolean },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = zAdd.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Write a criterion of at least a few words." };
  const v = await ownedVentureId(user.id, ventureId);

  await prisma.killCriterion.create({
    data: {
      ventureId: v.id,
      statement: parsed.data.statement,
      isFalsifiable: parsed.data.isFalsifiable ?? false,
    },
  });
  revalidatePath(`/ventures/${v.id}`);
  return { ok: true };
}

export async function setKillCriterionFalsifiable(
  criterionId: string,
  isFalsifiable: boolean,
): Promise<ActionResult> {
  const user = await requireUser();
  const k = await assertOwnsCriterion(user.id, criterionId);
  await prisma.killCriterion.update({
    where: { id: k.id },
    data: { isFalsifiable },
  });
  revalidatePath(`/ventures/${k.venture.id}`);
  return { ok: true };
}

export async function updateKillCriterionText(
  criterionId: string,
  statement: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = zAdd.shape.statement.safeParse(statement);
  if (!parsed.success) return { ok: false, error: "Criterion is too short." };
  const k = await assertOwnsCriterion(user.id, criterionId);
  await prisma.killCriterion.update({
    where: { id: k.id },
    data: { statement: parsed.data },
  });
  revalidatePath(`/ventures/${k.venture.id}`);
  return { ok: true };
}

// A criterion firing is a real event — record it in the log.
export async function triggerKillCriterion(
  criterionId: string,
  note: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const k = await assertOwnsCriterion(user.id, criterionId);
  const trimmed = note.trim();
  await prisma.killCriterion.update({
    where: { id: k.id },
    data: { isTriggered: true, triggeredNote: trimmed || null },
  });
  await logDecision({
    ventureId: k.venture.id,
    stage: k.venture.currentStage,
    decision: `Kill criterion triggered: "${k.statement}"`,
    reasoning: trimmed || "Marked as met.",
  });
  revalidatePath(`/ventures/${k.venture.id}`);
  return { ok: true };
}

export async function deleteKillCriterion(criterionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const k = await assertOwnsCriterion(user.id, criterionId);
  // Editable only before research begins.
  if (k.venture.currentStage !== "KILL_CRITERIA")
    return { ok: false, error: "Kill criteria lock once research begins." };
  await prisma.killCriterion.delete({ where: { id: k.id } });
  revalidatePath(`/ventures/${k.venture.id}`);
  return { ok: true };
}
