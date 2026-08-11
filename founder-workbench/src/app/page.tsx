import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { loadVenture, buildSnapshot } from "@/lib/venture";
import { nextAction, evaluateGate, STAGE_META, isVentureStage } from "@/lib/stages";
import { StageRail } from "@/components/StageRail";
import { Card, Eyebrow } from "@/components/ui";

export default async function Home() {
  const user = await requireUser();

  const profile = await prisma.constraintProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return <Onboarding />;

  const active = await prisma.venture.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });

  const [parkedCount, killedCount] = await Promise.all([
    prisma.venture.count({ where: { userId: user.id, status: "PARKED" } }),
    prisma.venture.count({ where: { userId: user.id, status: "KILLED" } }),
  ]);

  if (!active) return <NoActiveVenture parkedCount={parkedCount} killedCount={killedCount} />;

  const full = await loadVenture(user.id, active.id);
  if (!full) return <NoActiveVenture parkedCount={parkedCount} killedCount={killedCount} />;

  const snapshot = buildSnapshot(full);
  const stage = isVentureStage(full.currentStage) ? full.currentStage : "KILL_CRITERIA";
  const gate = evaluateGate(stage, snapshot);
  const action = nextAction(snapshot);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Active case</Eyebrow>
        <span className="eyebrow">
          {parkedCount} parked · {killedCount} in graveyard
        </span>
      </div>

      {/* The one active venture, one next action. */}
      <Card className="p-6">
        <div className="flex flex-col gap-1">
          <h1 className="display text-3xl">{full.title}</h1>
          <p className="text-ink-muted">{full.oneLiner}</p>
        </div>

        <div className="mt-6 border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
          <div className="eyebrow" style={{ color: "var(--accent)" }}>
            Next action
          </div>
          <p className="rubric mt-1 text-xl">{action}</p>
          <p className="mt-2 text-sm text-ink-muted">
            {STAGE_META[stage].label}: {gate.progress}
          </p>
        </div>

        <div className="mt-6">
          <StageRail current={stage} launched={full.status === "LAUNCHED"} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/ventures/${full.id}`} className="btn btn-primary">
            Open case
          </Link>
          <Link href="/graveyard" className="btn">
            Graveyard
          </Link>
        </div>
      </Card>

      <p className="text-sm text-ink-faint">
        One case at a time. You can switch from the case file, but it costs a written reason.
      </p>
    </div>
  );
}

function Onboarding() {
  return (
    <div className="max-w-measure py-6">
      <Eyebrow>Start here</Eyebrow>
      <h1 className="display mt-3 text-4xl leading-tight">
        Take one idea from “worth considering” to evidence someone will pay.
      </h1>
      <p className="mt-4 text-ink-muted">
        This is a workbench, not a chat. It moves one idea through a fixed sequence of stages
        and won't let you skip the hard one — talking to real people. It needs your constraints
        before any idea work.
      </p>
      <Link href="/constraints" className="btn btn-primary mt-6">
        Set your constraints
      </Link>
    </div>
  );
}

function NoActiveVenture({
  parkedCount,
  killedCount,
}: {
  parkedCount: number;
  killedCount: number;
}) {
  return (
    <div className="max-w-measure py-6">
      <Eyebrow>No active case</Eyebrow>
      <h1 className="display mt-3 text-3xl">Open one case.</h1>
      <p className="mt-3 text-ink-muted">
        Bring an idea, or draft a few from your constraints. One runs at a time.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/ventures/new" className="btn btn-primary">
          Open a case
        </Link>
        {parkedCount > 0 && (
          <Link href="/ventures/new#parked" className="btn">
            {parkedCount} parked
          </Link>
        )}
        {killedCount > 0 && (
          <Link href="/graveyard" className="btn">
            {killedCount} in graveyard
          </Link>
        )}
      </div>
    </div>
  );
}
