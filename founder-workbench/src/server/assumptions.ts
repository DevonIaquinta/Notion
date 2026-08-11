"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { zRiskLevel, zAssumptionStatus } from "@/lib/types";
import type { ActionResult } from "@/server/ventures";

async function ownedVentureId(userId: string, ventureId: string) {
  const v = await prisma.venture.findFirst({
    where: { id: ventureId, userId },
    select: { id: true },
  });
  if (!v) throw new Error("Venture not found.");
  return v.id;
}

async function assertOwnsAssumption(userId: string, assumptionId: string) {
  const a = await prisma.assumption.findFirst({
    where: { id: assumptionId, venture: { userId } },
    select: { id: true, ventureId: true },
  });
  if (!a) throw new Error("Assumption not found.");
  return a;
}

const zAdd = z.object({
  statement: z.string().trim().min(6).max(400),
  riskLevel: zRiskLevel,
});

export async function addAssumption(
  ventureId: string,
  input: { statement: string; riskLevel: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = zAdd.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Write the assumption and pick a risk level." };
  const id = await ownedVentureId(user.id, ventureId);
  await prisma.assumption.create({
    data: { ventureId: id, statement: parsed.data.statement, riskLevel: parsed.data.riskLevel },
  });
  revalidatePath(`/ventures/${id}`);
  return { ok: true };
}

const zUpdate = z.object({
  statement: z.string().trim().min(6).max(400).optional(),
  riskLevel: zRiskLevel.optional(),
  status: zAssumptionStatus.optional(),
});

export async function updateAssumption(
  assumptionId: string,
  input: { statement?: string; riskLevel?: string; status?: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = zUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assumption update." };
  const a = await assertOwnsAssumption(user.id, assumptionId);
  await prisma.assumption.update({ where: { id: a.id }, data: parsed.data });
  revalidatePath(`/ventures/${a.ventureId}`);
  return { ok: true };
}

export async function deleteAssumption(assumptionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const a = await assertOwnsAssumption(user.id, assumptionId);
  await prisma.assumption.delete({ where: { id: a.id } });
  revalidatePath(`/ventures/${a.ventureId}`);
  return { ok: true };
}

// Persist a whole AI-proposed map at once (user confirms, then this writes).
export async function replaceAssumptionsFromProposal(
  ventureId: string,
  proposals: { statement: string; riskLevel: string }[],
): Promise<ActionResult> {
  const user = await requireUser();
  const id = await ownedVentureId(user.id, ventureId);
  const clean = proposals
    .map((p) => zAdd.safeParse(p))
    .filter((r): r is { success: true; data: z.infer<typeof zAdd> } => r.success)
    .map((r) => r.data);
  if (clean.length === 0) return { ok: false, error: "No valid assumptions to add." };

  await prisma.assumption.createMany({
    data: clean.map((c) => ({ ventureId: id, statement: c.statement, riskLevel: c.riskLevel })),
  });
  revalidatePath(`/ventures/${id}`);
  return { ok: true };
}
