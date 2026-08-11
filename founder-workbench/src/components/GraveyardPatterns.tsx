"use client";

import { useState, useTransition } from "react";
import { graveyardPatternsAction } from "@/server/ai";
import type { GraveyardPatterns as Patterns } from "@/lib/ai/graveyard";

export function GraveyardPatterns() {
  const [pending, start] = useTransition();
  const [data, setData] = useState<Patterns | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Across your kills</div>
          <p className="mt-1 text-sm text-ink-muted">
            Three or more abandoned ideas usually share a shape. Surface it, and add a filter
            before the next one.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await graveyardPatternsAction();
              if (!res.ok) setError(res.error);
              else setData(res.data);
            })
          }
        >
          {pending ? "Reading…" : "Find the pattern"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--contradicts)" }}>
          {error}
        </p>
      )}

      {data && (
        <div className="mt-4 flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {data.patterns.map((p, i) => (
              <li key={i} className="text-sm">
                <p className="font-medium">{p.pattern}</p>
                <p className="text-ink-muted">{p.evidence}</p>
              </li>
            ))}
          </ul>
          <div
            className="p-3"
            style={{ borderLeft: "3px solid var(--accent)", backgroundColor: "var(--paper)" }}
          >
            <span className="eyebrow" style={{ color: "var(--accent)" }}>
              The blunt version
            </span>
            <p className="mt-1">{data.bluntTakeaway}</p>
          </div>
        </div>
      )}
    </div>
  );
}
