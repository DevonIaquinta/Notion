"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upsertOffer } from "@/server/offer";

interface OfferData {
  whoItsFor: string;
  problemSolved: string;
  deliverable: string;
  price: string;
  guarantee: string;
}

const FIELDS: { key: keyof OfferData; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: "whoItsFor", label: "Who it's for", placeholder: "The specific person, named as narrowly as you can" },
  { key: "problemSolved", label: "Problem solved", placeholder: "The one problem, in their words", textarea: true },
  { key: "deliverable", label: "Deliverable", placeholder: "Exactly what they get", textarea: true },
  { key: "price", label: "Price", placeholder: "$X, and how it's charged" },
  { key: "guarantee", label: "Guarantee", placeholder: "What you promise / how you de-risk it", textarea: true },
];

export function OfferPanel({ ventureId, offer }: { ventureId: string; offer: OfferData | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<OfferData>(
    offer ?? { whoItsFor: "", problemSolved: "", deliverable: "", price: "", guarantee: "" },
  );

  return (
    <div className="flex flex-col gap-4">
      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1.5">
          <span className="eyebrow">{f.label}</span>
          {f.textarea ? (
            <textarea
              className="field"
              rows={2}
              value={values[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          ) : (
            <input
              className="field"
              value={values[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          )}
        </label>
      ))}

      {error && (
        <p className="text-sm" style={{ color: "var(--contradicts)" }}>
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-ink-muted">Offer saved.</p>}

      <div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              setSaved(false);
              const res = await upsertOffer(ventureId, values);
              if (!res.ok) setError(res.error);
              else {
                setSaved(true);
                router.refresh();
              }
            })
          }
        >
          {pending ? "Saving…" : "Save offer"}
        </button>
      </div>
      <p className="text-xs text-ink-faint">
        To clear this gate you also need one price test — log what happened when you put the
        price in front of a real person.
      </p>
    </div>
  );
}
