import { formatDate } from "@/components/ui";

interface Entry {
  id: string;
  stage: string;
  decision: string;
  reasoning: string;
  createdAt: Date;
}

// Append-only. The trail that makes the workbench worth returning to.
export function DecisionLog({ entries }: { entries: Entry[] }) {
  if (entries.length === 0)
    return <p className="text-sm text-ink-faint">No decisions logged yet.</p>;

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((e) => (
        <li key={e.id} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{e.decision}</span>
            <span className="mono shrink-0 text-xs text-ink-faint">{formatDate(e.createdAt)}</span>
          </div>
          <p className="text-ink-muted">{e.reasoning}</p>
        </li>
      ))}
    </ol>
  );
}
