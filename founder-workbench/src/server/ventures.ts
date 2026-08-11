"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadVenture, buildSnapshot } from "@/lib/venture";
import { logDecision } from "@/lib/decisions";
import { evaluateGate, nextStage, isVentureStage, STAGE_META } from "@/lib/stages";

const zCreate = z.object({
  title: z.string().trim().min(2).max(120),
  oneLiner: z.string().trim().min(4).max(240),
  fitReason: z.string().trim().max(600).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

// Stage 2 gate: create a venture and mark it ACTIVE. Requires a constraint
// profile (stage 1) to exist first.
export async function createVenture(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const profile = await prisma.constraintProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) return { ok: false, error: "Define your constraints before creating a venture." };

  const parsed = zCreate.safeParse({
    title: formData.get("title"),
    oneLiner: formData.get("oneLiner"),
    fitReason: formData.get("fitReason") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Give the venture a title and a one-liner." };

  const venture = await prisma.venture.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      oneLiner: parsed.data.oneLiner,
      fitReason: parsed.data.fitReason,
      status: "ACTIVE",
      currentStage: "KILL_CRITERIA",
    },
  });

  await logDecision({
    ventureId: venture.id,
    stage: "IDEA_INTAKE",
    decision: `Started venture: ${venture.title}`,
    reasoning: parsed.data.fitReason ?? "Brought in by the founder.",
  });

  revalidatePath("/");
  redirect(`/ventures/${venture.id}`);
}

async function ownedVenture(userId: string, ventureId: string) {
  const v = await prisma.venture.findFirst({ where: { id: ventureId, userId } });
  if (!v) throw new Error("Venture not found.");
  return v;
}

// Kill: requires a written reason. Moves to the graveyard permanently.
export async function killVenture(ventureId: string, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  const trimmed = reason.trim();
  if (trimmed.length < 8)
    return { ok: false, error: "Write one honest sentence about why you're stopping." };

  const v = await ownedVenture(user.id, ventureId);
  await prisma.venture.update({
    where: { id: v.id },
    data: { status: "KILLED", killReason: trimmed, killedAt: new Date() },
  });
  await logDecision({
    ventureId: v.id,
    stage: v.currentStage,
    decision: "Killed the venture",
    reasoning: trimmed,
  });
  revalidatePath("/");
  revalidatePath("/graveyard");
  revalidatePath(`/ventures/${v.id}`);
  return { ok: true };
}

// Park: switch away from the active idea. Requires a reason (raises switching cost).
export async function parkVenture(ventureId: string, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  const trimmed = reason.trim();
  if (trimmed.length < 4) return { ok: false, error: "Say why you're parking this." };
  const v = await ownedVenture(user.id, ventureId);
  await prisma.venture.update({
    where: { id: v.id },
    data: { status: "PARKED", parkReason: trimmed },
  });
  await logDecision({
    ventureId: v.id,
    stage: v.currentStage,
    decision: "Parked the venture",
    reasoning: trimmed,
  });
  revalidatePath("/");
  revalidatePath(`/ventures/${v.id}`);
  return { ok: true };
}

// Re-activate a parked venture. Only one venture may be ACTIVE at a time; any
// currently-active venture is parked automatically.
export async function activateVenture(ventureId: string): Promise<ActionResult> {
  const user = await requireUser();
  const v = await ownedVenture(user.id, ventureId);
  if (v.status === "KILLED") return { ok: false, error: "Killed ventures stay in the graveyard." };

  await prisma.$transaction([
    prisma.venture.updateMany({
      where: { userId: user.id, status: "ACTIVE" },
      data: { status: "PARKED", parkReason: "Auto-parked: another venture became active." },
    }),
    prisma.venture.update({ where: { id: v.id }, data: { status: "ACTIVE" } }),
  ]);
  revalidatePath("/");
  revalidatePath(`/ventures/${v.id}`);
  return { ok: true };
}

// Advance the stage — but only if the gate is genuinely passed. This is the
// server-side enforcement; the UI never gets to skip it.
export async function advanceStage(ventureId: string): Promise<ActionResult> {
  const user = await requireUser();
  const v = await loadVenture(user.id, ventureId);
  if (!v) return { ok: false, error: "Venture not found." };
  if (!isVentureStage(v.currentStage)) return { ok: false, error: "Unknown stage." };

  const snapshot = buildSnapshot(v);
  const gate = evaluateGate(v.currentStage, snapshot);
  if (!gate.passed)
    return { ok: false, error: `Gate not cleared. ${gate.remaining[0] ?? gate.requirement}` };

  const next = nextStage(v.currentStage);
  if (!next) {
    // FIRST_DOLLAR: advancing means launching.
    await prisma.venture.update({ where: { id: v.id }, data: { status: "LAUNCHED" } });
    await logDecision({
      ventureId: v.id,
      stage: "FIRST_DOLLAR",
      decision: "Marked venture LAUNCHED",
      reasoning: "First real transaction logged.",
    });
  } else {
    await prisma.venture.update({ where: { id: v.id }, data: { currentStage: next } });
    await logDecision({
      ventureId: v.id,
      stage: v.currentStage,
      decision: `Advanced to ${STAGE_META[next].label}`,
      reasoning: `Gate cleared: ${gate.requirement}`,
    });
  }
  revalidatePath("/");
  revalidatePath(`/ventures/${v.id}`);
  return { ok: true };
}
