"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ActionResult } from "@/server/ventures";

async function ownedVentureId(userId: string, ventureId: string) {
  const v = await prisma.venture.findFirst({
    where: { id: ventureId, userId },
    select: { id: true },
  });
  if (!v) throw new Error("Venture not found.");
  return v.id;
}

const zOffer = z.object({
  whoItsFor: z.string().trim().min(2).max(400),
  problemSolved: z.string().trim().min(2).max(600),
  deliverable: z.string().trim().min(2).max(600),
  price: z.string().trim().min(1).max(120),
  guarantee: z.string().trim().min(2).max(600),
});

export async function upsertOffer(
  ventureId: string,
  input: {
    whoItsFor: string;
    problemSolved: string;
    deliverable: string;
    price: string;
    guarantee: string;
  },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = zOffer.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fill in every field of the offer." };
  const id = await ownedVentureId(user.id, ventureId);

  await prisma.offer.upsert({
    where: { ventureId: id },
    create: { ventureId: id, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath(`/ventures/${id}`);
  return { ok: true };
}
