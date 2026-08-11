"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addAssumption,
  updateAssumption,
  deleteAssumption,
  replaceAssumptionsFromProposal,
} from "@/server/assumptions";
import { proposeAssumptionsAction } from "@/server/ai";
import { RISK_LEVEL, ASSUMPTION_STATUS } from "@/lib/types";
import { RiskTag, AssumptionStatusTag } from "@/components/ui";
import type { AssumptionProposal } from "@/lib/ai/assumptions";

interface A {
  id: string;
  statement: string;
  riskLevel: string;
  status: string;
  evidenceCount: number;
}

export function AssumptionsPanel({
  ventureId,
  assumptions,
}: {
  ventureId: string;
  assumptions: A[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [statement, setStatement] = useState("");
  const [risk, setRisk] = useState<string>("SERIOUS");
  const [error, setError] = useState<string | null>(null);

  const [proposal, setProposal] = useState<AssumptionProposal | null>(null);
  const [proposing, startPropose] = useTransition();
  const [proposeError, setProposeError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  // The single riskiest untested assumption becomes the highlighted next move.
  const riskiest = [...assumptions]
    .filter((a) => a.status === "UNTESTED" || a.status === "TESTING")
    .sort((a, b) => rank(a.riskLevel) - rank(b.riskLevel))[0];

  return (
    <div className="flex flex-col gap-4">
      {riskiest && (
        <div
          className="p-3"
          style={{ borderLeft: "3px solid var(--accent)", backgroundColor: "var(--paper)" }}
        >
          <div className="eyebrow" style={{ color: "var(--accent)" }}>
            Riskiest untested assumption — test this next
          </div>
          <p className="mt-1">{riskiest.statement}</p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {assumptions.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-2 p-3"
            style={{ border: "1px solid var(--rule)", backgroundColor: "var(--paper)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{a.statement}</p>
              <button
                type="button"
                className="shrink-0 text-ink-faint hover:text-ink"
                aria-label="Delete assumption"
                onClick={() =>
                  start(async () => {
                    await deleteAssumption(a.id);
                    refresh();
                  })
                }
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="field mono !w-auto !py-1 text-xs"
                value={a.riskLevel}
                onChange={(e) =>
                  start(async () => {
                    await updateAssumption(a.id, { riskLevel: e.target.value });
                    refresh();
                  })
                }
                aria-label="Risk level"
              >
                {RISK_LEVEL.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                className="field mono !w-auto !py-1 text-xs"
                value={a.status}
                onChange={(e) =>
                  start(async () => {
                    await updateAssumption(a.id, { status: e.target.value });
                    refresh();
                  })
                }
                aria-label="Status"
              >
                {ASSUMPTION_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="eyebrow">
                {a.evidenceCount} linked {a.evidenceCount === 1 ? "entry" : "entries"}
              </span>
            </div>
          </li>
        ))}
        {assumptions.length === 0 && (
          <li className="text-sm text-ink-muted">
            No assumptions yet. Break the idea into claims that must be true, and rank them.
          </li>
        )}
      </ul>

      <div className="flex flex-col gap-2">
        <textarea
          className="field"
          rows={2}
          placeholder="People in this segment will pay at least $X per month for this."
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="field mono !w-auto"
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            aria-label="Risk level"
          >
            {RISK_LEVEL.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            disabled={pending || statement.trim().length < 6}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await addAssumption(ventureId, { statement, riskLevel: risk });
                if (!res.ok) setError(res.error);
                else {
                  setStatement("");
                  refresh();
                }
              })
            }
          >
            Add assumption
          </button>
          <button
            type="button"
            className="btn"
            disabled={proposing}
            onClick={() =>
              startPropose(async () => {
                setProposeError(null);
                setProposal(null);
                const res = await proposeAssumptionsAction(ventureId);
                if (!res.ok) setProposeError(res.error);
                else setProposal(res.data);
              })
            }
          >
            {proposing ? "Mapping…" : "Propose with AI"}
          </button>
        </div>
        {error && (
          <p className="text-sm" style={{ color: "var(--contradicts)" }}>
            {error}
          </p>
        )}
      </div>

      {proposeError && (
        <p className="text-sm" style={{ color: "var(--contradicts)" }}>
          {proposeError}
        </p>
      )}

      {proposal && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Proposed map — you confirm before it's saved</div>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await replaceAssumptionsFromProposal(
                    ventureId,
                    proposal.assumptions.map((p) => ({ statement: p.statement, riskLevel: p.riskLevel })),
                  );
                  if (res.ok) {
                    setProposal(null);
                    refresh();
                  }
                })
              }
            >
              Add all
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {proposal.assumptions.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <RiskTag risk={p.riskLevel} />
                <div>
                  <p>{p.statement}</p>
                  <p className="text-xs text-ink-faint">{p.why}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <span className="eyebrow">Riskiest untested</span> — {proposal.riskiestUntested}
          </p>
        </div>
      )}
    </div>
  );
}

function rank(risk: string): number {
  return risk === "FATAL" ? 0 : risk === "SERIOUS" ? 1 : 2;
}
