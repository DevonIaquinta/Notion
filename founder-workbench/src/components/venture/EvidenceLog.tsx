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

// The centerpiece. A dense, chronological ledger that gets more satisfying as
// it fills. Named conversations are counted toward the evidence gate.
export function EvidenceLog({ entries }: { entries: Entry[] }) {
  const namedConversations = entries.filter(
    (e) => e.type === "CONVERSATION" && e.source.trim().length > 0,
  ).length;

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
          {namedConversations}/{MIN_CONVERSATIONS} named conversations
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-faint">
          Empty. Every conversation, price test, and data point you log becomes part of the
          permanent record for this idea.
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="grid grid-cols-[auto_1fr] gap-x-4 py-4"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--rule)" }}
            >
              <div className="mono pt-0.5 text-xs text-ink-faint" style={{ minWidth: "5.5rem" }}>
                {formatDate(e.date)}
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
