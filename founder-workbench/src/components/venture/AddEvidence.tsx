"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addEvidence } from "@/server/evidence";
import { writeQuestionsAction, checkFindingAction } from "@/server/ai";
import { EVIDENCE_TYPE, EVIDENCE_TYPE_LABEL, VERDICT, VERDICT_LABEL } from "@/lib/types";
import type { InterviewQuestions, FindingCheck } from "@/lib/ai/evidence";

interface AssumptionOpt {
  id: string;
  statement: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AddEvidence({
  ventureId,
  assumptions,
}: {
  ventureId: string;
  assumptions: AssumptionOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [type, setType] = useState("CONVERSATION");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(today());
  const [assumptionId, setAssumptionId] = useState("");
  const [claimTested, setClaimTested] = useState("");
  const [finding, setFinding] = useState("");
  const [verdict, setVerdict] = useState("INCONCLUSIVE");
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<InterviewQuestions | null>(null);
  const [qLoading, startQ] = useTransition();
  const [check, setCheck] = useState<FindingCheck | null>(null);
  const [checking, startCheck] = useTransition();

  const selectedAssumption = assumptions.find((a) => a.id === assumptionId);

  function reset() {
    setSource("");
    setDate(today());
    setClaimTested("");
    setFinding("");
    setVerdict("INCONCLUSIVE");
    setQuestions(null);
    setCheck(null);
    setError(null);
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Log evidence
      </button>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="eyebrow">New evidence entry</div>
        <button type="button" className="text-ink-faint hover:text-ink" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Type</span>
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            {EVIDENCE_TYPE.map((t) => (
              <option key={t} value={t}>
                {EVIDENCE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">
            {type === "CONVERSATION" ? "Who — real name & role" : "Source"}
          </span>
          <input
            className="field"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={type === "CONVERSATION" ? "Dana Ruiz, ops lead at Kettle Co." : "Where this came from"}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Date</span>
          <input className="field mono" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Tests which assumption</span>
          <select className="field" value={assumptionId} onChange={(e) => setAssumptionId(e.target.value)}>
            <option value="">— not linked —</option>
            {assumptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.statement.slice(0, 70)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type === "CONVERSATION" && selectedAssumption && (
        <div className="mt-4">
          <button
            type="button"
            className="btn"
            disabled={qLoading}
            onClick={() =>
              startQ(async () => {
                setQuestions(null);
                const res = await writeQuestionsAction(ventureId, selectedAssumption.statement);
                if (res.ok) setQuestions(res.data);
              })
            }
          >
            {qLoading ? "Drafting…" : "Draft interview questions"}
          </button>
          {questions && (
            <div className="mt-3 p-3" style={{ border: "1px solid var(--rule)", backgroundColor: "var(--paper)" }}>
              <div className="eyebrow">Ask these — don't pitch</div>
              <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm">
                {questions.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
              {questions.avoid.length > 0 && (
                <p className="mt-2 text-xs text-ink-faint">Avoid: {questions.avoid.join(" · ")}</p>
              )}
            </div>
          )}
        </div>
      )}

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="eyebrow">What claim were you testing?</span>
        <input
          className="field"
          value={claimTested}
          onChange={(e) => setClaimTested(e.target.value)}
          placeholder="Whether they'd pay monthly to avoid this problem"
        />
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="eyebrow">What actually happened — your words</span>
        <textarea className="field" rows={3} value={finding} onChange={(e) => setFinding(e.target.value)} />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Verdict</span>
          <select className="field !w-auto" value={verdict} onChange={(e) => setVerdict(e.target.value)}>
            {VERDICT.map((v) => (
              <option key={v} value={v}>
                {VERDICT_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn"
          disabled={checking || finding.trim().length < 3 || claimTested.trim().length < 3}
          onClick={() =>
            startCheck(async () => {
              setCheck(null);
              const res = await checkFindingAction(ventureId, {
                assumption: selectedAssumption?.statement ?? "",
                claimTested,
                finding,
                type,
              });
              if (res.ok) setCheck(res.data);
            })
          }
        >
          {checking ? "Checking…" : "Check this evidence"}
        </button>
      </div>

      {check && (
        <div
          className="mt-3 p-3 text-sm"
          style={{
            border: `1px solid ${check.actuallyTests ? "var(--supports)" : "var(--contradicts)"}`,
            backgroundColor: "var(--paper)",
          }}
        >
          <span
            className="mono text-[0.62rem] uppercase"
            style={{ color: check.actuallyTests ? "var(--supports)" : "var(--contradicts)" }}
          >
            {check.actuallyTests ? "Tests the claim" : "Doesn't test the claim"} · suggests {check.verdictSuggestion}
          </span>
          <p className="mt-1">{check.critique}</p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--contradicts)" }}>
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await addEvidence(ventureId, {
                type,
                source,
                date,
                claimTested,
                finding,
                verdict,
                assumptionId: assumptionId || null,
              });
              if (!res.ok) setError(res.error);
              else {
                reset();
                setOpen(false);
                router.refresh();
              }
            })
          }
        >
          {pending ? "Logging…" : "Log evidence"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Evidence is append-only. Once logged, it stays — that's what makes the record trustworthy.
      </p>
    </div>
  );
}
