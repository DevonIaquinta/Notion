import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { asStringArray } from "@/lib/types";
import { Eyebrow } from "@/components/ui";
import { ConstraintForm } from "@/components/ConstraintForm";

export default async function ConstraintsPage() {
  const user = await requireUser();
  const profile = await prisma.constraintProfile.findUnique({ where: { userId: user.id } });

  const initial = profile
    ? {
        capitalAvailable: profile.capitalAvailable,
        hoursPerWeek: profile.hoursPerWeek,
        monthsUntilRevenueNeeded: profile.monthsUntilRevenueNeeded,
        riskTolerance: profile.riskTolerance,
        accessAssets: asStringArray(profile.accessAssets),
        toleranceProfile: asStringArray(profile.toleranceProfile),
        hardExclusions: asStringArray(profile.hardExclusions),
      }
    : undefined;

  return (
    <div className="max-w-measure">
      <Eyebrow>Stage 1 · done once, always editable</Eyebrow>
      <h1 className="display mt-3 text-3xl">Your constraints</h1>
      <p className="mt-3 text-ink-muted">
        This is the filter every idea runs through. Money and time matter, but access and
        tolerance are what keep the recommendations from being generic. Be honest — the app
        holds you to these.
      </p>
      <ConstraintForm initial={initial} />
    </div>
  );
}
