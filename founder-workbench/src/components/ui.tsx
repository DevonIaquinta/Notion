import type { ReactNode } from "react";
import {
  VERDICT_LABEL,
  RISK_LEVEL_LABEL,
  ASSUMPTION_STATUS_LABEL,
  EVIDENCE_TYPE_LABEL,
  type Verdict,
  type RiskLevel,
  type AssumptionStatus,
  type EvidenceType,
} from "@/lib/types";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Tag({
  children,
  color,
  title,
}: {
  children: ReactNode;
  color: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="mono inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.66rem] uppercase tracking-wider"
      style={{ color, border: `1px solid ${color}`, borderRadius: 2, lineHeight: 1.1 }}
    >
      {children}
    </span>
  );
}

export function VerdictTag({ verdict }: { verdict: Verdict }) {
  const color =
    verdict === "SUPPORTS"
      ? "var(--supports)"
      : verdict === "CONTRADICTS"
        ? "var(--contradicts)"
        : "var(--inconclusive)";
  return <Tag color={color}>{VERDICT_LABEL[verdict]}</Tag>;
}

export function RiskTag({ risk }: { risk: RiskLevel }) {
  const color =
    risk === "FATAL"
      ? "var(--contradicts)"
      : risk === "SERIOUS"
        ? "var(--inconclusive)"
        : "var(--ink-faint)";
  return <Tag color={color}>{RISK_LEVEL_LABEL[risk]}</Tag>;
}

export function AssumptionStatusTag({ status }: { status: AssumptionStatus }) {
  const color =
    status === "SUPPORTED"
      ? "var(--supports)"
      : status === "REFUTED"
        ? "var(--contradicts)"
        : status === "TESTING"
          ? "var(--inconclusive)"
          : "var(--ink-faint)";
  return <Tag color={color}>{ASSUMPTION_STATUS_LABEL[status]}</Tag>;
}

export function EvidenceTypeTag({ type }: { type: EvidenceType }) {
  return <Tag color="var(--ink-muted)">{EVIDENCE_TYPE_LABEL[type]}</Tag>;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
