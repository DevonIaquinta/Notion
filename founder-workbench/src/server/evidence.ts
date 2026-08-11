"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { zEvidenceType, zVerdict } from "@/lib/types";
import type { ActionResult } from "@/server/ventures";

async function ownedVentureId(userId: string, ventureId: string) {
  const v = await prisma.venture.findFirst({
    where: { id: ventureId, userId },
    select: { id: true },
  });
  if (!v) throw new Error("Venture not found.");
  return v.id;
}

const zAdd = z.object({
  type: zEvidenceType,
  source: z.string().trim().min(1).max(160),
  date: z.coerce.date(),
  claimTested: z.string().trim().min(3).max(400),
  finding: z.string().trim().min(3).max(2000),
  verdict: zVerdict,
  assumptionId: z.string().trim().min(1).optional().nullable(),
});

// Evidence is append-only: there is intentionally no edit or delete action.
export async function addEvidence(
  ventureId: string,
  input: {
    type: string;
    source: string;
    date: string;
    claimTested: string;
    finding: string;
    verdict: string;
    assumptionId?: string | null;
  },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = zAdd.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid evidence." };
  }
  const id = await ownedVentureId(user.id, ventureId);

  // If linked to an assumption, verify it belongs to this venture.
  let assumptionId: string | null = null;
  if (parsed.data.assumptionId) {
    const a = await prisma.assumption.findFirst({
      where: { id: parsed.data.assumptionId, ventureId: id },
      select: { id: true },
    });
    assumptionId = a?.id ?? null;
  }

  await prisma.evidenceEntry.create({
    data: {
      ventureId: id,
      type: parsed.data.type,
      source: parsed.data.source,
      date: parsed.data.date,
      claimTested: parsed.data.claimTested,
      finding: parsed.data.finding,
      verdict: parsed.data.verdict,
      assumptionId,
    },
  });

  revalidatePath(`/ventures/${id}`);
  return { ok: true };
}
