import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { loadVenture, buildSnapshot } from "@/lib/venture";
import {
  evaluateGate,
  nextAction,
  nextStage,
  STAGE_META,
  isVentureStage,
} from "@/lib/stages";
import { StageRail } from "@/components/StageRail";
import { Card, Eyebrow } from "@/components/ui";
import { AdvanceControls } from "@/components/venture/AdvanceControls";
import { KillCriteriaPanel } from "@/components/venture/KillCriteriaPanel";
import { AssumptionsPanel } from "@/components/venture/AssumptionsPanel";
import { EvidenceLog } from "@/components/venture/EvidenceLog";
import { AddEvidence } from "@/components/venture/AddEvidence";
import { OfferPanel } from "@/components/venture/OfferPanel";
import { DecisionLog } from "@/components/venture/DecisionLog";
import type { ReactNode } from "react";

function Section({
  title,
  hint,
  active,
  children,
}: {
  title: string;
  hint?: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="card p-5"
      style={active ? { borderTop: "2px solid var(--accent)" } : undefined}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="display text-xl">{title}</h2>
        {active && (
          <span className="eyebrow" style={{ color: "var(--accent)" }}>
            current stage
          </span>
        )}
      </div>
      {hint && <p className="mb-4 text-sm text-ink-muted">{hint}</p>}
      {children}
    </section>
  );
}

export default async function VentureCaseFile({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const v = await loadVenture(user.id, params.id);
  if (!v) notFound();

  const snapshot = buildSnapshot(v);
  const stage = isVentureStage(v.currentStage) ? v.currentStage : "KILL_CRITERIA";
  const gate = evaluateGate(stage, snapshot);
  const action = nextAction(snapshot);
  const next = nextStage(stage);
  const launched = v.status === "LAUNCHED";
  const killed = v.status === "KILLED";

  const advanceLabel = launched
    ? "Launched"
    : next
      ? `Advance to ${STAGE_META[next].label.toLowerCase()}`
      : "Mark launched";

  const stageIndex = ["KILL_CRITERIA", "ASSUMPTION_MAPPING", "EVIDENCE", "OFFER", "FIRST_DOLLAR"].indexOf(stage);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-ink-faint hover:text-ink">
        ← Workbench
      </Link>

      {/* Case header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>
            {killed ? "Closed case" : launched ? "Launched" : v.status === "PARKED" ? "Parked case" : "Active case"}
          </Eyebrow>
        </div>
        <h1 className="display mt-2 text-3xl">{v.title}</h1>
        <p className="mt-1 text-ink-muted">{v.oneLiner}</p>

        {killed && v.killReason && (
          <div
            className="mt-4 p-3 text-sm"
            style={{ borderLeft: "3px solid var(--contradicts)", backgroundColor: "var(--paper)" }}
          >
            <span className="eyebrow" style={{ color: "var(--contradicts)" }}>
              Kill reason
            </span>
            <p className="mt-1">{v.killReason}</p>
          </div>
        )}

        {!killed && (
          <div className="mt-5 border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
            <div className="eyebrow" style={{ color: "var(--accent)" }}>
              Next action
            </div>
            <p className="rubric mt-1 text-xl">{action}</p>
          </div>
        )}

        <div className="mt-6">
          <StageRail current={stage} launched={launched} />
        </div>

        {!killed && !launched && (
          <div className="mt-5 flex flex-col gap-3 border-t pt-5" style={{ borderColor: "var(--rule)" }}>
            <div className="text-sm">
              <span className="eyebrow">Gate — {STAGE_META[stage].label}</span>
              <p className="mt-1">{gate.requirement}</p>
              <p className="mt-1 text-ink-muted">{gate.progress}</p>
              {gate.remaining.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-ink-muted">
                  {gate.remaining.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
            <AdvanceControls
              ventureId={v.id}
              canAdvance={gate.passed}
              advanceLabel={advanceLabel}
              status={v.status}
            />
          </div>
        )}

        {v.status === "PARKED" && (
          <p className="mt-4 text-sm text-ink-muted">
            This case is parked. Reopen it from the{" "}
            <Link href="/ventures/new" className="underline">
              intake page
            </Link>{" "}
            to keep working.
          </p>
        )}

        <div className="mt-5">
          <Link href={`/ventures/${v.id}/export`} className="btn no-print">
            Export case file
          </Link>
        </div>
      </Card>

      {/* Kill criteria */}
      <Section
        title="Kill criteria"
        hint={STAGE_META.KILL_CRITERIA.blurb}
        active={stage === "KILL_CRITERIA"}
      >
        <KillCriteriaPanel
          ventureId={v.id}
          editable={stage === "KILL_CRITERIA" && v.status === "ACTIVE"}
          criteria={v.killCriteria.map((k) => ({
            id: k.id,
            statement: k.statement,
            isFalsifiable: k.isFalsifiable,
            isTriggered: k.isTriggered,
            triggeredNote: k.triggeredNote,
          }))}
        />
      </Section>

      {/* Assumptions */}
      {stageIndex >= 1 && (
        <Section
          title="Assumption map"
          hint={STAGE_META.ASSUMPTION_MAPPING.blurb}
          active={stage === "ASSUMPTION_MAPPING"}
        >
          <AssumptionsPanel
            ventureId={v.id}
            assumptions={v.assumptions.map((a) => ({
              id: a.id,
              statement: a.statement,
              riskLevel: a.riskLevel,
              status: a.status,
              evidenceCount: a.evidence.length,
            }))}
          />
        </Section>
      )}

      {/* Evidence — the centerpiece */}
      {stageIndex >= 1 && (
        <Section
          title="Evidence log"
          hint={stage === "EVIDENCE" ? STAGE_META.EVIDENCE.blurb : undefined}
          active={stage === "EVIDENCE"}
        >
          <div className="flex flex-col gap-5">
            {v.status === "ACTIVE" && (
              <AddEvidence
                ventureId={v.id}
                assumptions={v.assumptions.map((a) => ({ id: a.id, statement: a.statement }))}
              />
            )}
            <EvidenceLog
              entries={v.evidence.map((e) => ({
                id: e.id,
                type: e.type,
                source: e.source,
                date: e.date,
                claimTested: e.claimTested,
                finding: e.finding,
                verdict: e.verdict,
                assumption: e.assumption ? { statement: e.assumption.statement } : null,
              }))}
            />
          </div>
        </Section>
      )}

      {/* Offer */}
      {stageIndex >= 3 && (
        <Section title="Offer" hint={STAGE_META.OFFER.blurb} active={stage === "OFFER"}>
          <OfferPanel
            ventureId={v.id}
            offer={
              v.offer
                ? {
                    whoItsFor: v.offer.whoItsFor,
                    problemSolved: v.offer.problemSolved,
                    deliverable: v.offer.deliverable,
                    price: v.offer.price,
                    guarantee: v.offer.guarantee,
                  }
                : null
            }
          />
        </Section>
      )}

      {/* First dollar */}
      {stageIndex >= 4 && (
        <Section title="First dollar" hint={STAGE_META.FIRST_DOLLAR.blurb} active={stage === "FIRST_DOLLAR"}>
          <ul className="flex flex-col gap-2 text-sm">
            {[
              "Put the exact offer in front of one qualified person.",
              "Ask for the money — a deposit, a pre-order, or full payment.",
              "Collect it with a payment method you already have. No new tools.",
              "When the payment lands, mark the case launched.",
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mono text-ink-faint">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Decision log */}
      <Section title="Decision log">
        <DecisionLog
          entries={v.decisionLog.map((d) => ({
            id: d.id,
            stage: d.stage,
            decision: d.decision,
            reasoning: d.reasoning,
            createdAt: d.createdAt,
          }))}
        />
      </Section>
    </div>
  );
}
