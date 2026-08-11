"use client";

import { useState, useTransition } from "react";
import { createVenture } from "@/server/ventures";
import { generateIdeasAction } from "@/server/ai";
import type { GeneratedIdea } from "@/lib/ai/ideaIntake";

export function IdeaIntake() {
  const [title, setTitle] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [fitReason, setFitReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [steer, setSteer] = useState("");
  const [ideas, setIdeas] = useState<GeneratedIdea[] | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [generating, startGen] = useTransition();

  function pick(idea: GeneratedIdea) {
    setTitle(idea.title);
    setOneLiner(idea.oneLiner);
    setFitReason(idea.fitReason);
    // Scroll the form into view for confirmation.
    document.getElementById("intake-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Manual intake — always available, never blocked behind AI. */}
      <form
        id="intake-form"
        action={(fd) =>
          start(async () => {
            setError(null);
            const res = await createVenture(fd);
            // On success createVenture redirects; a returned value means failure.
            if (res && !res.ok) setError(res.error);
          })
        }
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Working title</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="field"
            placeholder="Route-density lawn care for HOA blocks"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">One-liner — who it's for, what it does</span>
          <input
            name="oneLiner"
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
            required
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Why this fits you (optional)</span>
          <textarea
            name="fitReason"
            value={fitReason}
            onChange={(e) => setFitReason(e.target.value)}
            className="field"
            rows={2}
          />
        </label>

        {error && (
          <p className="text-sm" style={{ color: "var(--contradicts)" }}>
            {error}
          </p>
        )}

        <div>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Opening…" : "Open case"}
          </button>
        </div>
      </form>

      {/* Constrained generation — few, tightly derived from constraints. */}
      <div className="card p-5">
        <div className="eyebrow">Or draft a few — derived from your constraints</div>
        <p className="mt-2 text-sm text-ink-muted">
          At most five, each with a stated reason it fits you specifically. Not a firehose.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="field"
            placeholder="Optional steer: a domain, a customer, a constraint to lean into"
            value={steer}
            onChange={(e) => setSteer(e.target.value)}
          />
          <button
            type="button"
            disabled={generating}
            className="btn whitespace-nowrap"
            onClick={() =>
              startGen(async () => {
                setGenError(null);
                setIdeas(null);
                const res = await generateIdeasAction(steer || undefined);
                if (!res.ok) setGenError(res.error);
                else setIdeas(res.data.ideas);
              })
            }
          >
            {generating ? "Drafting…" : "Draft ideas"}
          </button>
        </div>

        {genError && (
          <p className="mt-3 text-sm" style={{ color: "var(--contradicts)" }}>
            {genError}
          </p>
        )}

        {ideas && ideas.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3">
            {ideas.map((idea, i) => (
              <li
                key={i}
                className="flex flex-col gap-2 p-4"
                style={{ border: "1px solid var(--rule)", backgroundColor: "var(--paper)" }}
              >
                <div className="display text-lg">{idea.title}</div>
                <div className="text-sm text-ink-muted">{idea.oneLiner}</div>
                <div className="text-sm">
                  <span className="eyebrow">Why you</span>
                  <p className="mt-1">{idea.fitReason}</p>
                </div>
                <div className="text-sm">
                  <span className="eyebrow">Cheapest first proof</span>
                  <p className="mt-1 text-ink-muted">{idea.firstProof}</p>
                </div>
                <div>
                  <button type="button" className="btn" onClick={() => pick(idea)}>
                    Use this idea
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
