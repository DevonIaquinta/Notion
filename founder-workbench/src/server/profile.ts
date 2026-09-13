"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { zRiskTolerance, encodeStringArray } from "@/lib/types";
import type { ActionResult } from "@/server/ventures";

// Multi-line textareas collapse to string[] (one item per non-empty line).
function lines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 50);
}

const zProfile = z.object({
  capitalAvailable: z.coerce.number().int().min(0).max(100_000_000),
  hoursPerWeek: z.coerce.number().int().min(1).max(168),
  monthsUntilRevenueNeeded: z.coerce.number().int().min(0).max(120),
  riskTolerance: zRiskTolerance,
});

export async function saveConstraintProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = zProfile.safeParse({
    capitalAvailable: formData.get("capitalAvailable"),
    hoursPerWeek: formData.get("hoursPerWeek"),
    monthsUntilRevenueNeeded: formData.get("monthsUntilRevenueNeeded"),
    riskTolerance: formData.get("riskTolerance"),
  });
  if (!parsed.success)
    return { ok: false, error: "Check the capital, hours, months, and risk fields." };

  const accessAssets = lines(formData.get("accessAssets"));
  const toleranceProfile = lines(formData.get("toleranceProfile"));
  const hardExclusions = lines(formData.get("hardExclusions"));

  if (accessAssets.length === 0)
    return { ok: false, error: "List at least one access asset — a person, industry, or credential you already have." };
  if (toleranceProfile.length === 0)
    return { ok: false, error: "Name at least one kind of unpleasant work you mind less than most people." };

  const data = {
    capitalAvailable: parsed.data.capitalAvailable,
    hoursPerWeek: parsed.data.hoursPerWeek,
    monthsUntilRevenueNeeded: parsed.data.monthsUntilRevenueNeeded,
    riskTolerance: parsed.data.riskTolerance,
    accessAssets: encodeStringArray(accessAssets),
    toleranceProfile: encodeStringArray(toleranceProfile),
    hardExclusions: encodeStringArray(hardExclusions),
  };

  await prisma.constraintProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/");
  revalidatePath("/constraints");
  return { ok: true };
}
