"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { advanceStage, killVenture, parkVenture } from "@/server/ventures";

export function AdvanceControls({
  ventureId,
  canAdvance,
  advanceLabel,
  status,
}: {
  ventureId: string;
  canAdvance: boolean;
  advanceLabel: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<null | "kill" | "park">(null);
  const [reason, setReason] = useState("");

  const active = status === "ACTIVE";

  function submitReason() {
    start(async () => {
      setError(null);
      const res =
        mode === "kill"
          ? await killVenture(ventureId, reason)
          : await parkVenture(ventureId, reason);
      if (!res.ok) setError(res.error);
      else {
        setMode(null);
        setReason("");
        router.refresh();
        if (mode === "kill") router.push("/graveyard");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {active && (
          <button
            type="button"
            disabled={!canAdvance || pending}
            className="btn btn-primary"
            title={canAdvance ? "" : "The gate isn't cleared yet."}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await advanceStage(ventureId);
                if (!res.ok) setError(res.error);
                else router.refresh();
              })
            }
          >
            {pending ? "Working…" : advanceLabel}
          </button>
        )}

        {active && (
          <>
            <button type="button" className="btn" onClick={() => setMode(mode === "park" ? null : "park")}>
              Park
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setMode(mode === "kill" ? null : "kill")}
            >
              Kill
            </button>
          </>
        )}
      </div>

      {mode && (
        <div
          className="flex flex-col gap-2 p-4"
          style={{ border: "1px solid var(--rule)", backgroundColor: "var(--paper)" }}
        >
          <label className="eyebrow">
            {mode === "kill"
              ? "Why are you stopping? (one honest sentence — it's kept)"
              : "Why park this?"}
          </label>
          <textarea
            className="field"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={mode === "kill" ? "btn btn-danger" : "btn btn-primary"}
              disabled={pending}
              onClick={submitReason}
            >
              {pending ? "Saving…" : mode === "kill" ? "Move to graveyard" : "Park venture"}
            </button>
            <button type="button" className="btn" onClick={() => setMode(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--contradicts)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
