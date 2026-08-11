import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { loadVenture } from "@/lib/venture";
import { asStringArray } from "@/lib/types";
import { STAGE_META, isVentureStage } from "@/lib/stages";
import {
  VERDICT_LABEL,
  RISK_LEVEL_LABEL,
  ASSUMPTION_STATUS_LABEL,
  EVIDENCE_TYPE_LABEL,
  type Verdict,
  type RiskLevel,
  type AssumptionStatus,
  type EvidenceType,
} from "@/lib/types";
import { formatDate } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="display mt-8 text-lg" style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "0.35rem" }}>
      {children}
    </h2>
  );
}

export default async function ExportPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const v = await loadVenture(user.id, params.id);
  if (!v) notFound();
  const profile = await prisma.constraintProfile.findUnique({ where: { userId: user.id } });

  const stage = isVentureStage(v.currentStage) ? v.currentStage : "KILL_CRITERIA";

  return (
    <div className="mx-auto max-w-measure">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/ventures/${v.id}`} className="text-sm text-ink-faint hover:text-ink">
          ← Back to case file
        </Link>
        <PrintButton />
      </div>

      <article className="text-[0.95rem] leading-relaxed">
        <header>
          <div className="eyebrow">Founder Workbench · Case File</div>
          <h1 className="display mt-2 text-3xl">{v.title}</h1>
          <p className="mt-1 text-ink-muted">{v.oneLiner}</p>
          <p className="mono mt-2 text-xs text-ink-faint">
            Status: {v.status} · Stage: {STAGE_META[stage].label} · Compiled {formatDate(new Date())}
          </p>
          {v.killReason && (
            <p className="mt-3 text-sm">
              <strong>Kill decision:</strong> {v.killReason}
            </p>
          )}
        </header>

        {profile && (
          <>
            <H>Constraints</H>
            <table className="mt-2 w-full text-sm">
              <tbody>
                <Row k="Capital available" val={`$${profile.capitalAvailable.toLocaleString()}`} />
                <Row k="Time" val={`${profile.hoursPerWeek} hrs/week`} />
                <Row k="Runway" val={`revenue needed within ${profile.monthsUntilRevenueNeeded} months`} />
                <Row k="Risk tolerance" val={profile.riskTolerance} />
                <Row k="Access assets" val={asStringArray(profile.accessAssets).join("; ") || "—"} />
                <Row k="Tolerance profile" val={asStringArray(profile.toleranceProfile).join("; ") || "—"} />
                <Row k="Hard exclusions" val={asStringArray(profile.hardExclusions).join("; ") || "—"} />
              </tbody>
            </table>
          </>
        )}

        <H>Kill criteria</H>
        {v.killCriteria.length === 0 ? (
          <p className="mt-2 text-ink-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {v.killCriteria.map((k) => (
              <li key={k.id} className="text-sm">
                {k.isTriggered ? "⚑ " : "• "}
                {k.statement}
                {k.isFalsifiable ? "" : " (not yet falsifiable)"}
                {k.isTriggered && k.triggeredNote ? ` — ${k.triggeredNote}` : ""}
              </li>
            ))}
          </ul>
        )}

        <H>Assumptions</H>
        {v.assumptions.length === 0 ? (
          <p className="mt-2 text-ink-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {v.assumptions.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="mono text-xs text-ink-faint">
                  [{RISK_LEVEL_LABEL[a.riskLevel as RiskLevel]} · {ASSUMPTION_STATUS_LABEL[a.status as AssumptionStatus]}]
                </span>{" "}
                {a.statement}
              </li>
            ))}
          </ul>
        )}

        <H>Evidence ({v.evidence.length})</H>
        {v.evidence.length === 0 ? (
          <p className="mt-2 text-ink-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {[...v.evidence]
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="mono text-xs text-ink-faint">
                    {formatDate(e.date)} · {EVIDENCE_TYPE_LABEL[e.type as EvidenceType]} ·{" "}
                    {VERDICT_LABEL[e.verdict as Verdict]}
                  </div>
                  <div>
                    <strong>{e.source}</strong> — {e.finding}
                  </div>
                  <div className="text-ink-muted">Tested: {e.claimTested}</div>
                </li>
              ))}
          </ul>
        )}

        {v.offer && (
          <>
            <H>Offer</H>
            <table className="mt-2 w-full text-sm">
              <tbody>
                <Row k="Who it's for" val={v.offer.whoItsFor} />
                <Row k="Problem solved" val={v.offer.problemSolved} />
                <Row k="Deliverable" val={v.offer.deliverable} />
                <Row k="Price" val={v.offer.price} />
                <Row k="Guarantee" val={v.offer.guarantee} />
              </tbody>
            </table>
          </>
        )}

        <H>Decision log</H>
        {v.decisionLog.length === 0 ? (
          <p className="mt-2 text-ink-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {[...v.decisionLog]
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
              .map((d) => (
                <li key={d.id} className="text-sm">
                  <div className="mono text-xs text-ink-faint">{formatDate(d.createdAt)}</div>
                  <strong>{d.decision}</strong> — {d.reasoning}
                </li>
              ))}
          </ul>
        )}

        <footer className="mt-10 border-t pt-3 text-xs text-ink-faint" style={{ borderColor: "var(--rule)" }}>
          Compiled by Founder Workbench. This is the founder's own record of evidence and decisions.
        </footer>
      </article>
    </div>
  );
}

function Row({ k, val }: { k: string; val: string }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--rule)" }}>
      <td className="py-1.5 pr-4 align-top font-medium" style={{ width: "34%" }}>
        {k}
      </td>
      <td className="py-1.5 align-top">{val}</td>
    </tr>
  );
}
