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
            className="flex min-w-[7.5rem] flex-1 flex-col gap-1 px-3 py-2"
            style={{
              backgroundColor: active
                ? "var(--ink)"
                : done
                  ? "color-mix(in srgb, var(--ink) 8%, var(--paper-raised))"
                  : "var(--paper-raised)",
              color: active ? "var(--paper)" : done ? "var(--ink)" : "var(--ink-faint)",
              border: "1px solid var(--rule)",
            }}
            aria-current={active ? "step" : undefined}
          >
            <span
              className="mono text-[0.62rem] uppercase tracking-wider"
              style={{ opacity: active ? 0.8 : 0.7 }}
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
