import { VENTURE_STAGES, STAGE_META, type VentureStage } from "@/lib/stages";

// Stage progress, always visible, never a percentage. Past stages are inked
// in; the current stage is marked; future stages are faint.
export function StageRail({
  current,
  launched = false,
}: {
  current: VentureStage;
  launched?: boolean;
}) {
  const currentIndex = VENTURE_STAGES.indexOf(current);

  return (
    <ol className="flex flex-wrap items-stretch gap-px" aria-label="Stage progress">
      {VENTURE_STAGES.map((stage, i) => {
        const meta = STAGE_META[stage as VentureStage];
        const done = launched || i < currentIndex;
        const active = !launched && i === currentIndex;
        return (
          <li
            key={stage}
            className="flex min-w-[7rem] flex-1 flex-col gap-1 px-3 py-2"
            style={{
              backgroundColor: active
                ? "color-mix(in srgb, var(--accent) 8%, var(--paper-raised))"
                : done
                  ? "color-mix(in srgb, var(--ink) 6%, var(--paper-raised))"
                  : "var(--paper-raised)",
              color: active ? "var(--ink)" : done ? "var(--ink)" : "var(--ink-faint)",
              border: "1px solid var(--rule)",
              // The active stage is marked by a single brass top rule, not a fill.
              borderTop: active ? "2px solid var(--accent)" : "1px solid var(--rule)",
            }}
            aria-current={active ? "step" : undefined}
          >
            <span
              className="mono text-[0.62rem] uppercase tracking-wider"
              style={{ color: active ? "var(--accent)" : "inherit", opacity: active ? 1 : 0.7 }}
            >
              {done ? "✓" : `0${meta.number}`}
            </span>
            <span className="text-sm leading-tight">{meta.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
