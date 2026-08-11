import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Eyebrow, formatDate } from "@/components/ui";
import { IdeaIntake } from "@/components/IdeaIntake";
import { ActivateButton } from "@/components/ActivateButton";
import { STAGE_META, isVentureStage } from "@/lib/stages";

export default async function NewVenturePage() {
  const user = await requireUser();
  const profile = await prisma.constraintProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/constraints");

  const parked = await prisma.venture.findMany({
    where: { userId: user.id, status: "PARKED" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-measure">
      <Eyebrow>Stage 2 · idea intake</Eyebrow>
      <h1 className="display mt-3 text-3xl">Bring an idea, or draft a few.</h1>
      <p className="mt-3 text-ink-muted">
        Whatever you open becomes your active case. Everything after this is elimination, not
        more ideas.
      </p>

      <div className="mt-8">
        <IdeaIntake />
      </div>

      {parked.length > 0 && (
        <section id="parked" className="mt-12">
          <Eyebrow>Parked</Eyebrow>
          <ul className="mt-3 flex flex-col gap-2">
            {parked.map((v) => {
              const stage = isVentureStage(v.currentStage) ? v.currentStage : "KILL_CRITERIA";
              return (
                <li
                  key={v.id}
                  className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link href={`/ventures/${v.id}`} className="display text-lg hover:underline">
                      {v.title}
                    </Link>
                    <p className="text-sm text-ink-muted">{v.oneLiner}</p>
                    <p className="eyebrow mt-1">
                      {STAGE_META[stage].label} · parked {formatDate(v.updatedAt)}
                    </p>
                  </div>
                  <ActivateButton ventureId={v.id} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
