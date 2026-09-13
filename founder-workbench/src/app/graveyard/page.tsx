import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Eyebrow, formatDate } from "@/components/ui";
import { STAGE_META, isVentureStage } from "@/lib/stages";
import { GraveyardPatterns } from "@/components/GraveyardPatterns";

export default async function GraveyardPage() {
  const user = await requireUser();
  const kills = await prisma.venture.findMany({
    where: { userId: user.id, status: "KILLED" },
    orderBy: { killedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Graveyard</Eyebrow>
        <h1 className="display mt-2 text-3xl">Cases you closed.</h1>
        <p className="mt-2 max-w-measure text-ink-muted">
          Killing a case on purpose, with a reason on the record, is a decision — not a failure.
          Kept here so the next case starts sharper.
        </p>
      </div>

      {kills.length >= 3 && <GraveyardPatterns />}

      {kills.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-faint">
          Nothing here yet. When you kill a case, it comes to rest here with the reason you gave.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {kills.map((k) => {
            const stage = isVentureStage(k.currentStage) ? k.currentStage : "KILL_CRITERIA";
            return (
              <li key={k.id} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/ventures/${k.id}`} className="display text-lg hover:underline">
                    {k.title}
                  </Link>
                  <span className="mono text-xs text-ink-faint">
                    {k.killedAt ? formatDate(k.killedAt) : ""} · killed at {STAGE_META[stage].label.toLowerCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{k.oneLiner}</p>
                {k.killReason && (
                  <p className="mt-3 text-sm" style={{ borderLeft: "2px solid var(--rule)", paddingLeft: "0.75rem" }}>
                    {k.killReason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
