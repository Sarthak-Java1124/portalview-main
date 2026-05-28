import Link from "next/link";
import { formatAddress } from "@/lib/format";
import type { ReviewJob } from "@/types/review.types";

interface ReviewCardProps {
  job: ReviewJob;
  dense?: boolean;
}

const STATUS_META: Record<string, { bar: string; chip: string; label: string }> = {
  Open:       { bar: "accent-bar-open",      chip: "chip-violet",  label: "OPEN" },
  InReview:   { bar: "accent-bar-review",    chip: "chip-amber",   label: "IN REVIEW" },
  Consensus:  { bar: "accent-bar-consensus", chip: "chip-amber",   label: "CONSENSUS" },
  Finalized:  { bar: "accent-bar-final",     chip: "chip-emerald", label: "FINALIZED" },
  Cancelled:  { bar: "accent-bar-cancelled", chip: "chip-slate",   label: "CANCELLED" },
};

export function ReviewCard({ job, dense = false }: ReviewCardProps) {
  const s = STATUS_META[job.status] ?? STATUS_META.Open;
  const bounty = job.stakeAmount / 1_000_000_000_000n;
  const shortHash = job.contractHash.slice(0, 10) + "…" + job.contractHash.slice(-4);

  return (
    <Link href={`/review/${job.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        className="glass-card"
        style={{
          padding: dense ? "1rem 1.125rem 1rem 1.375rem" : "1.125rem 1.25rem 1.125rem 1.375rem",
          position: "relative",
          display: "flex", flexDirection: "column", gap: 12,
        }}
      >
        <div className={`accent-bar ${s.bar}`} />

        {/* Top row: title + chips + bounty */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: ".95rem", fontWeight: 600, color: "var(--ink)" }}>
                {job.description.split(" ").slice(0, 5).join(" ")}
                {job.description.split(" ").length > 5 ? "…" : ""}
              </span>
              <span className={`chip ${s.chip}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                {s.label}
              </span>
              <span className="chip chip-slate" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".62rem" }}>
                ink!
              </span>
            </div>
            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--ink-3)", fontSize: ".72rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"/>
                </svg>
                <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{shortHash}</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/>
                  <circle cx="17" cy="8" r="3"/><path d="M15 14c3 0 6 2 6 5"/>
                </svg>
                <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{formatAddress(job.submitter)}</span>
              </span>
              <span>{job.findingCount} findings</span>
            </div>
          </div>

          {/* Bounty */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: "var(--font-mono, monospace)", fontSize: "1.5rem", fontWeight: 700,
              color: "var(--ink)", letterSpacing: "-.02em", lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}>
              {bounty.toLocaleString()}
            </div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".64rem", letterSpacing: ".08em", color: "var(--ink-4)", marginTop: 4 }}>
              POT BOUNTY
            </div>
          </div>
        </div>

        {/* Bottom row: actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: ".72rem", color: "var(--ink-4)" }}>
            Block #{job.openedAtBlock.toLocaleString()} → #{job.closesAtBlock.toLocaleString()}
          </span>
          <span className="btn btn-ghost btn-sm" style={{ pointerEvents: "none" }}>
            {job.status === "Finalized" ? "View Report" : "Open Job"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
