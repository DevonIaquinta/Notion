"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveConstraintProfile } from "@/server/profile";
import { RISK_TOLERANCE } from "@/lib/types";

interface Props {
  initial?: {
    capitalAvailable: number;
    hoursPerWeek: number;
    monthsUntilRevenueNeeded: number;
    riskTolerance: string;
    accessAssets: string[];
    toleranceProfile: string[];
    hardExclusions: string[];
  };
}

export function ConstraintForm({ initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          setSaved(false);
          const res = await saveConstraintProfile(fd);
          if (!res.ok) setError(res.error);
          else {
            setSaved(true);
            router.push("/");
          }
        })
      }
      className="mt-8 flex flex-col gap-6"
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Capital available (USD)</span>
          <input
            name="capitalAvailable"
            type="number"
            min={0}
            defaultValue={initial?.capitalAvailable ?? ""}
            required
            className="field mono"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Hours / week</span>
          <input
            name="hoursPerWeek"
            type="number"
            min={1}
            max={168}
            defaultValue={initial?.hoursPerWeek ?? ""}
            required
            className="field mono"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Months until revenue needed</span>
          <input
            name="monthsUntilRevenueNeeded"
            type="number"
            min={0}
            defaultValue={initial?.monthsUntilRevenueNeeded ?? ""}
            required
            className="field mono"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <span className="eyebrow">Risk tolerance</span>
        <div className="flex gap-2">
          {RISK_TOLERANCE.map((r) => (
            <label key={r} className="flex-1">
              <input
                type="radio"
                name="riskTolerance"
                value={r}
                defaultChecked={(initial?.riskTolerance ?? "MEDIUM") === r}
                className="peer sr-only"
                required
              />
              <span className="btn w-full justify-center peer-checked:!border-ink peer-checked:!bg-ink peer-checked:!text-paper">
                {r[0] + r.slice(1).toLowerCase()}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Access assets — one per line</span>
        <span className="text-sm text-ink-muted">
          People, industries, or credentials you already have. This is half of what makes a
          recommendation yours and not generic.
        </span>
        <textarea
          name="accessAssets"
          rows={4}
          defaultValue={initial?.accessAssets?.join("\n") ?? ""}
          placeholder={"12 years in commercial HVAC\nSister runs a dental practice\nHAM radio license"}
          className="field"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Tolerance profile — one per line</span>
        <span className="text-sm text-ink-muted">
          Unpleasant work you mind less than most people: cold calls, regulatory reading,
          physical labor, anxious customers.
        </span>
        <textarea
          name="toleranceProfile"
          rows={4}
          defaultValue={initial?.toleranceProfile?.join("\n") ?? ""}
          placeholder={"Cold outreach doesn't bother me\nHappy to read dense regulation\nFine with early mornings"}
          className="field"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Hard exclusions — one per line</span>
        <span className="text-sm text-ink-muted">Lines the app must never cross when suggesting ideas.</span>
        <textarea
          name="hardExclusions"
          rows={3}
          defaultValue={initial?.hardExclusions?.join("\n") ?? ""}
          placeholder={"No inventory\nNo employees\nNothing requiring a license"}
          className="field"
        />
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--contradicts)" }}>
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-ink-muted">Saved.</p>}

      <div>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : initial ? "Update constraints" : "Save constraints"}
        </button>
      </div>
    </form>
  );
}
