"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addKillCriterion,
  setKillCriterionFalsifiable,
  updateKillCriterionText,
  deleteKillCriterion,
  triggerKillCriterion,
} from "@/server/killCriteria";
import { reviewKillCriteriaAction } from "@/server/ai";
import type { KillCriteriaReview } from "@/lib/ai/killCriteria";

interface Criterion {
  id: string;
  statement: string;
  isFalsifiable: boolean;
  isTriggered: boolean;
  triggeredNote: string | null;
}

export function KillCriteriaPanel({
  ventureId,
  criteria,
  editable,
}: {
  ventureId: string;
  criteria: Criterion[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [falsifiable, setFalsifiable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [review, setReview] = useState<KillCriteriaReview | null>(null);
  const [reviewing, startReview] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {criteria.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-2 p-3"
            style={{
              border: "1px solid var(--rule)",
              backgroundColor: "var(--paper)",
              borderLeft: `3px solid ${c.isFalsifiable ? "var(--supports)" : "var(--inconclusive)"}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={c.isTriggered ? "line-through opacity-70" : ""}>{c.statement}</p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="mono text-[0.62rem] uppercase tracking-wider"
                  style={{ color: c.isFalsifiable ? "var(--supports)" : "var(--inconclusive)" }}
                  onClick={() =>
                    start(async () => {
                      await setKillCriterionFalsifiable(c.id, !c.isFalsifiable);
                      refresh();
                    })
                  }
                  title="Toggle whether this criterion is falsifiable"
                >
                  {c.isFalsifiable ? "falsifiable ✓" : "vague — fix"}
                </button>
                {editable && !c.isTriggered && (
                  <button
                    type="button"
                    className="text-ink-faint hover:text-ink"
                    aria-label="Delete criterion"
                    onClick={() =>
                      start(async () => {
                        await deleteKillCriterion(c.id);
                        refresh();
                      })
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {!c.isTriggered ? (
              <button
                type="button"
                className="self-start text-xs text-ink-faint underline hover:text-contradicts"
                onClick={() =>
                  start(async () => {
                    const note = window.prompt("What met this criterion?") ?? "";
                    await triggerKillCriterion(c.id, note);
                    refresh();
                  })
                }
              >
                Mark this criterion met
              </button>
            ) : (
              <p className="text-xs" style={{ color: "var(--contradicts)" }}>
                Met{c.triggeredNote ? ` — ${c.triggeredNote}` : ""}
              </p>
            )}
          </li>
        ))}
        {criteria.length === 0 && (
          <li className="text-sm text-ink-muted">No criteria yet. Write the conditions that would make you walk away.</li>
        )}
      </ul>

      {editable && (
        <div className="flex flex-col gap-2">
          <textarea
            className="field"
            rows={2}
            placeholder="If fewer than 3 of 10 people I interview have already paid to solve this, I stop."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={falsifiable}
                onChange={(e) => setFalsifiable(e.target.checked)}
              />
              It names a concrete threshold (falsifiable)
            </label>
            <button
              type="button"
              className="btn"
              disabled={pending || text.trim().length < 6}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await addKillCriterion(ventureId, {
                    statement: text,
                    isFalsifiable: falsifiable,
                  });
                  if (!res.ok) setError(res.error);
                  else {
                    setText("");
                    setFalsifiable(false);
                    refresh();
                  }
                })
              }
            >
              Add criterion
            </button>
            <button
              type="button"
              className="btn"
              disabled={reviewing || criteria.length === 0}
              onClick={() =>
                startReview(async () => {
                  setReviewError(null);
                  setReview(null);
                  const res = await reviewKillCriteriaAction(ventureId);
                  if (!res.ok) setReviewError(res.error);
                  else setReview(res.data);
                })
              }
            >
              {reviewing ? "Checking…" : "Check criteria"}
            </button>
          </div>
          {error && (
            <p className="text-sm" style={{ color: "var(--contradicts)" }}>
              {error}
            </p>
          )}
        </div>
      )}

      {reviewError && (
        <p className="text-sm" style={{ color: "var(--contradicts)" }}>
          {reviewError}
        </p>
      )}

      {review && (
        <div className="card p-4">
          <div className="eyebrow">Falsifiability check</div>
          <ul className="mt-3 flex flex-col gap-3">
            {review.criteria.map((r, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="mono text-[0.62rem] uppercase"
                    style={{ color: r.isFalsifiable ? "var(--supports)" : "var(--inconclusive)" }}
                  >
                    {r.isFalsifiable ? "falsifiable" : "vague"}
                  </span>
                  <span className="text-ink-muted">{r.original}</span>
                </div>
                <p className="mt-1 text-ink-muted">{r.problem}</p>
                {!r.isFalsifiable && (
                  <p className="mt-1">
                    <span className="eyebrow">Sharper</span> — {r.sharpened}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            Use these to rewrite your own criteria above. The app won't overwrite your words for you.
          </p>
        </div>
      )}
    </div>
  );
}
