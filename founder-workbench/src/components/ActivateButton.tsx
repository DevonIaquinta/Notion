"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { activateVenture } from "@/server/ventures";

export function ActivateButton({ ventureId }: { ventureId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        className="btn"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await activateVenture(ventureId);
            if (!res.ok) setError(res.error);
            else router.push(`/ventures/${ventureId}`);
          })
        }
      >
        {pending ? "Activating…" : "Re-activate"}
      </button>
      {error && (
        <span className="text-sm" style={{ color: "var(--contradicts)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
