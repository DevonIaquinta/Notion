import { VerdictTag, EvidenceTypeTag, formatDate } from "@/components/ui";
import type { EvidenceType, Verdict } from "@/lib/types";
import { MIN_CONVERSATIONS } from "@/lib/stages";

interface Entry {
  id: string;
  type: string;
  source: string;
  date: Date;
  claimTested: string;
  finding: string;
  verdict: string;
  assumption: { statement: string } | null;
}

// The centerpiece and the app's signature: a bound, numbered register. Rows
// carry a chronological index numeral in the margin (like pleading paper or a
// lab notebook), divide by hairlines, and grow denser as they fill. Named
// conversations count toward the evidence gate.
export function EvidenceLog({ entries }: { entries: Entry[] }) {
  const namedConversations = entries.filter(
    (e) => e.type === "CONVERSATION" && e.source.trim().length > 0,
  ).length;

  // Chronological index: oldest entry is No. 1, regardless of display order.
  const orderById = new Map(
    [...entries]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((e, i) => [e.id, i + 1] as const),
  );
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="mono text-2xl">{entries.length}</span>
          <span className="ml-2 text-sm text-ink-muted">
            {entries.length === 1 ? "entry" : "entries"} on the record
          </span>
        </div>
        <div className="eyebrow">
          {namedConversations} of {MIN_CONVERSATIONS} named conversations
        </div>
      </div>

      {entries.length === 0 ? (
        <div
          className="flex flex-col gap-2 py-10 text-center"
          style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}
        >
          <span className="mono text-xs text-ink-faint">No. 01 — pending</span>
          <p className="rubric text-lg" style={{ color: "var(--accent)" }}>
            Log your first conversation.
          </p>
          <p className="mx-auto max-w-sm text-sm text-ink-muted">
            Every conversation, price test, and data point stays on this record. Five named
            conversations clear this stage.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="grid grid-cols-[auto_1fr] gap-x-4 py-4"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--rule)" }}
            >
              <div className="flex flex-col gap-0.5 pt-0.5" style={{ minWidth: "5.5rem" }}>
                <span className="mono text-xs" style={{ color: "var(--accent)" }}>
                  No. {pad(orderById.get(e.id) ?? i + 1)}
                </span>
                <span className="mono text-xs text-ink-faint">{formatDate(e.date)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceTypeTag type={e.type as EvidenceType} />
                  <VerdictTag verdict={e.verdict as Verdict} />
                  <span className="text-sm font-medium">{e.source}</span>
                </div>
                <p className="text-sm">{e.finding}</p>
                <p className="text-xs text-ink-faint">
                  Tested: {e.claimTested}
                  {e.assumption ? ` · on “${truncate(e.assumption.statement, 60)}”` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
