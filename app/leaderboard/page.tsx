"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Spinner } from "@/components/ui/Spinner";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useWallet } from "@/hooks/useWallet";
import { useReputation } from "@/hooks/useReputation";
import { formatAddress } from "@/lib/format";
import type { ReputationScore, ReputationTier } from "@/types/reputation.types";

const TIER_CLASS: Record<ReputationTier, string> = {
  Legend:      "tier-legend",
  Expert:      "tier-expert",
  Senior:      "tier-senior",
  Journeyman:  "tier-journeyman",
  Apprentice:  "tier-apprentice",
  Novice:      "tier-novice",
};

const SCOPE_OPTIONS = [
  { id: "all",    l: "All time" },
  { id: "season", l: "This season" },
  { id: "weekly", l: "Last 7 days" },
  { id: "watch",  l: "Watchlist" },
] as const;
type Scope = typeof SCOPE_OPTIONS[number]["id"];

const PAGE_SIZE = 7;

// ── Podium card ───────────────────────────────────────────────
function PodiumCard({ entry, rank }: { entry: ReputationScore; rank: 1 | 2 | 3 }) {
  const heights: Record<1 | 2 | 3, number> = { 1: 250, 2: 210, 3: 200 };
  const medalBg: Record<1 | 2 | 3, string> = {
    1: "var(--accent)",
    2: "var(--background)",
    3: "var(--ink)",
  };
  const medalColor: Record<1 | 2 | 3, string> = {
    1: "var(--ink)",
    2: "var(--ink)",
    3: "white",
  };

  const initials = entry.address.slice(2, 4).toUpperCase();
  const potEarned = entry.score / 10n;

  return (
    <div
      className={`podium-card rank-${rank} fade-up fade-up-${rank}`}
      style={{
        height: heights[rank],
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 8, padding: "1.5rem 1rem",
      }}
    >
      {/* rank medal */}
      <div style={{
        position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)",
        width: 36, height: 36,
        background: medalBg[rank], color: medalColor[rank],
        border: "1px solid var(--ink)",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-mono,monospace)",
        fontSize: "1rem", fontWeight: 700,
      }}>
        {rank}
      </div>

      {/* avatar */}
      <span className="avatar" style={{ width: 48, height: 48, fontSize: ".82rem" }}>
        {initials}
      </span>

      <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".78rem", fontWeight: 500, color: "var(--ink)" }}>
        {formatAddress(entry.address, 6)}
      </span>

      <span className={`chip ${TIER_CLASS[entry.tier]}`}>{entry.tier}</span>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: "1.75rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-.025em", lineHeight: 1 }}>
          {entry.score.toLocaleString()}
        </span>
        <span style={{ fontSize: ".66rem", letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-4)" }}>REP score</span>
      </div>

      <div style={{ width: "60%", height: 1, background: "var(--line-2)" }} />

      <div style={{ display: "flex", gap: 14, fontSize: ".7rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 600, color: "var(--ink-2)" }}>
            {entry.reviewsCompleted}
          </div>
          <div style={{ fontSize: ".62rem", color: "var(--ink-4)" }}>reviews</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 600, color: "var(--ink)" }}>
            {potEarned.toLocaleString()}
          </div>
          <div style={{ fontSize: ".62rem", color: "var(--ink-4)" }}>POT earned</div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { entries, isLoading, error, refresh } = useLeaderboard();
  const { selectedAccount } = useWallet();
  useReputation(selectedAccount?.address);

  const [scope, setScope] = useState<Scope>("all");
  const [page, setPage] = useState(1);

  const top3    = entries.slice(0, 3);
  const rest    = entries.slice(3);
  const total   = rest.length;

  const pageStart  = (page - 1) * PAGE_SIZE;
  const pageEnd    = Math.min(pageStart + PAGE_SIZE, total);
  const pageRows   = rest.slice(pageStart, pageEnd);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // podium order: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]] as [ReputationScore, ReputationScore, ReputationScore]
    : null;

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <span className="label-cap">{"// SEASON 5"}</span>
          <h1 style={{ margin: "12px 0 6px", fontSize: "2rem", fontWeight: 700, letterSpacing: "-.025em", color: "var(--ink)" }}>
            Reputation leaderboard
          </h1>
          <p style={{ margin: 0, fontSize: ".88rem", color: "var(--ink-3)" }}>
            Top reviewers on Portaldot · season ends in{" "}
            <span style={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 600, color: "var(--ink)" }}>12 days 4h</span>
          </p>
        </div>

        {/* ── Scope chips ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {SCOPE_OPTIONS.map((s) => (
            <button
              key={s.id}
              className={`filter-chip ${scope === s.id ? "is-active" : ""}`}
              onClick={() => { setScope(s.id); setPage(1); }}
            >
              {s.l}
            </button>
          ))}
        </div>

        {/* ── Loading / error ── */}
        {isLoading && entries.length === 0 && (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <Spinner size="lg" />
          </div>
        )}
        {error && (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <p style={{ fontSize: ".85rem", color: "var(--danger)", marginBottom: 12 }}>{error}</p>
            <button className="btn btn-ghost btn-sm" onClick={refresh}>Retry</button>
          </div>
        )}

        {/* ── Podium ── */}
        {podiumOrder && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", gap: 14, alignItems: "flex-end" }}>
            <PodiumCard entry={podiumOrder[0]} rank={2} />
            <PodiumCard entry={podiumOrder[1]} rank={1} />
            <PodiumCard entry={podiumOrder[2]} rank={3} />
          </div>
        )}

        {/* ── Rankings table ── */}
        {entries.length > 0 && (
          <div className="glass-strong" style={{ overflow: "hidden" }}>
            {/* header row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "60px 1.4fr 1fr 0.9fr 0.7fr 1fr 0.7fr 0.8fr",
              padding: "0.75rem 1.25rem",
              background: "var(--ink)",
              borderBottom: "1px solid var(--ink)",
              fontSize: ".66rem", letterSpacing: ".1em", textTransform: "uppercase",
              fontWeight: 600, color: "rgba(255,255,255,0.6)",
            }}>
              <span>Rank</span>
              <span>Address</span>
              <span>Tier</span>
              <span style={{ textAlign: "right" }}>Score</span>
              <span style={{ textAlign: "right" }}>Reviews</span>
              <span style={{ textAlign: "right" }}>POT Earned</span>
              <span style={{ textAlign: "right" }}>Slashes</span>
              <span style={{ textAlign: "right" }}>Joined</span>
            </div>

            {/* body rows (ranks 4+) */}
            {pageRows.map((e, idx) => {
              const rank    = pageStart + idx + 4; // +4 because top3 shown in podium
              const isMe    = selectedAccount?.address === e.address;
              const initials = e.address.slice(2, 4).toUpperCase();
              const potEarned = e.score / 10n;

              return (
                <div
                  key={e.address}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1.4fr 1fr 0.9fr 0.7fr 1fr 0.7fr 0.8fr",
                    padding: "0.875rem 1.25rem",
                    borderBottom: idx < pageRows.length - 1 ? "1px solid var(--line)" : "none",
                    background: isMe ? "var(--paper)" : "transparent",
                    boxShadow: isMe ? "inset 3px 0 0 var(--accent), inset -1px 0 0 var(--ink)" : "none",
                    alignItems: "center",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isMe) (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { if (!isMe) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem", fontWeight: 600,
                    fontVariantNumeric: "tabular-nums", color: "var(--ink-4)",
                  }}>#{rank}</span>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="avatar" style={{ width: 26, height: 26, fontSize: ".62rem" }}>{initials}</span>
                    <span style={{
                      fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem",
                      fontWeight: isMe ? 600 : 500, color: "var(--ink)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {formatAddress(e.address, 8)}
                    </span>
                    {isMe && <span className="chip chip-violet" style={{ fontSize: ".58rem" }}>YOU</span>}
                  </div>

                  <span className={`chip ${TIER_CLASS[e.tier]}`} style={{ width: "fit-content" }}>{e.tier}</span>

                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", textAlign: "right", fontWeight: 600,
                    color: "var(--ink-2)", fontVariantNumeric: "tabular-nums",
                  }}>
                    {e.score.toLocaleString()}
                  </span>

                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", textAlign: "right",
                    color: "var(--ink-4)", fontVariantNumeric: "tabular-nums",
                  }}>
                    {e.reviewsCompleted}
                  </span>

                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", textAlign: "right",
                    fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums",
                  }}>
                    {potEarned.toLocaleString()}
                  </span>

                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", textAlign: "right",
                    color: e.slashCount > 0 ? "var(--danger)" : "var(--ink-5)",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {e.slashCount}
                  </span>

                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", textAlign: "right",
                    fontSize: ".75rem", color: "var(--ink-4)",
                  }}>
                    S1
                  </span>
                </div>
              );
            })}

            {/* Pagination footer */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "0.875rem 1.25rem",
              background: "var(--bg-elevated)",
              borderTop: "1px solid var(--line)",
            }}>
              <span style={{ fontSize: ".74rem", color: "var(--ink-4)" }}>
                Showing {pageStart + 4}–{pageEnd + 3} of{" "}
                <span style={{ fontFamily: "var(--font-mono,monospace)", color: "var(--ink-2)", fontWeight: 600 }}>
                  {entries.length}
                </span>{" "}
                reviewers
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ←
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`filter-chip ${page === n ? "is-active" : ""}`}
                    style={{ minWidth: 32 }}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div style={{ textAlign: "center", paddingBottom: "1rem" }}>
          <p style={{ fontSize: ".75rem", color: "var(--ink-4)", margin: 0 }}>
            Scores recompute every block. Tier promotions trigger on consensus thresholds —{" "}
            <a href="#" style={{ fontWeight: 600 }}>protocol spec</a>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
