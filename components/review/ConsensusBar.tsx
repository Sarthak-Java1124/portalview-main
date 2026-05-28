import type { ConsensusState } from "@/types/review.types";

interface ConsensusBarProps {
  consensus: ConsensusState;
  compact?: boolean;
}

export function ConsensusBar({ consensus }: ConsensusBarProps) {
  const { confirmedFindings, threshold } = consensus;
  const pct = Math.min(100, threshold > 0 ? (confirmedFindings / threshold) * 100 : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem" }}>
        <span style={{ color: "var(--ink-4)", letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 600 }}>
          Consensus
        </span>
        <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
          {confirmedFindings}/{threshold}
        </span>
      </div>
      <div className="consensus-track" role="progressbar" aria-valuenow={confirmedFindings} aria-valuemax={threshold}>
        <div className="consensus-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
