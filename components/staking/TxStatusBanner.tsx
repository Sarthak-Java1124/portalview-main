import type { TxStatus } from "@/types/staking.types";

interface TxStatusBannerProps {
  status: TxStatus;
  txHash?: string | null;
  blockHash?: string | null;
  error?: string | null;
  onReset?: () => void;
}

const PRESETS: Record<Exclude<TxStatus, "idle">, {
  tint: string; border: string; color: string; label: string; spin?: boolean; pulse?: boolean;
}> = {
  pending:   { tint: "var(--accent-soft)",          border: "var(--ink)",    color: "var(--ink)",    label: "Signing transaction…",              spin: true },
  broadcast: { tint: "rgba(29,78,216,0.08)",         border: "var(--info)",   color: "var(--info)",   label: "Broadcasting to network…",          spin: true },
  inBlock:   { tint: "rgba(202,138,4,0.10)",         border: "var(--warn)",   color: "var(--warn)",   label: "In block, waiting for finality…",   pulse: true },
  finalized: { tint: "var(--accent)",                border: "var(--ink)",    color: "var(--ink)",    label: "Finalized on Portaldot" },
  error:     { tint: "rgba(185,28,28,0.08)",         border: "var(--danger)", color: "var(--danger)", label: "Transaction reverted" },
};

const SpinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
    <path d="M12 3v3"/><path d="M12 18v3"/><path d="M5.6 5.6 7.7 7.7"/><path d="M16.3 16.3l2.1 2.1"/>
    <path d="M3 12h3"/><path d="M18 12h3"/><path d="M5.6 18.4 7.7 16.3"/><path d="M16.3 7.7l2.1-2.1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 12 10 18 20 6"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5l14 14M19 5 5 19"/>
  </svg>
);

const HexIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "pulse 1.6s ease-in-out infinite", flexShrink: 0 }}>
    <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"/>
  </svg>
);

export function TxStatusBanner({ status, txHash, blockHash, error, onReset }: TxStatusBannerProps) {
  if (status === "idle") return null;

  const p = PRESETS[status];

  const icon = p.spin ? <SpinIcon /> : p.pulse ? <HexIcon /> : status === "finalized" ? <CheckIcon /> : status === "error" ? <XIcon /> : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0.75rem 1rem",
        background: p.tint,
        border: `1px solid ${p.border}`,
        borderRadius: 2,
        color: p.color,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--background)", border: `1px solid ${p.border}`,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: ".8rem", fontWeight: 600 }}>{p.label}</span>
        {status === "pending" && (
          <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".7rem", color: "var(--ink-4)" }}>Awaiting signature from wallet…</span>
        )}
        {status === "inBlock" && (
          <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".7rem", color: "var(--ink-4)" }}>1 of 2 confirmations</span>
        )}
        {status === "finalized" && blockHash && (
          <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".7rem", color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Block: {blockHash.slice(0, 18)}…
          </span>
        )}
        {error && (
          <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".7rem", color: "var(--danger)", wordBreak: "break-all" }}>{error}</span>
        )}
        {txHash && status !== "finalized" && (
          <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".7rem", color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Tx: {txHash.slice(0, 20)}…
          </span>
        )}
      </div>
      {(status === "finalized" || status === "error") && onReset && (
        <button
          onClick={onReset}
          style={{ fontSize: ".72rem", color: "var(--ink-3)", textDecoration: "underline", cursor: "pointer", background: "none", border: "none", flexShrink: 0 }}
        >
          {status === "error" ? "Try again" : "New tx"}
        </button>
      )}
    </div>
  );
}
