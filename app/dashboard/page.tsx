"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { useWallet } from "@/hooks/useWallet";
import { useReputation } from "@/hooks/useReputation";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { formatBalance } from "@/lib/format";
import Link from "next/link";

function WelcomeCard({ onSubmit, onReview }: { onSubmit: () => void; onReview: () => void }) {
  return (
    <div style={{
      border: "1px solid var(--ink)", background: "var(--accent)",
      boxShadow: "4px 4px 0 var(--ink)", padding: "1.5rem",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink)", marginBottom: 4 }}>
          Welcome to PortalReview
        </div>
        <p style={{ margin: 0, fontSize: ".85rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          This is a decentralized peer review platform for ink! smart contracts.
          What would you like to do?
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Link href="/submit" style={{ textDecoration: "none" }} onClick={onSubmit}>
          <div style={{
            border: "1px solid var(--ink)", background: "var(--background)",
            padding: "1rem", cursor: "pointer",
            transition: "box-shadow 0.1s",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0 var(--ink)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>
              </svg>
              <span style={{ fontWeight: 600, fontSize: ".88rem" }}>Submit a Contract</span>
            </div>
            <p style={{ margin: 0, fontSize: ".78rem", color: "var(--ink-3)", lineHeight: 1.5 }}>
              Upload your ink! contract, set a POT bounty, and get security findings from auditors.
            </p>
          </div>
        </Link>
        <Link href="/review" style={{ textDecoration: "none" }} onClick={onReview}>
          <div style={{
            border: "1px solid var(--ink)", background: "var(--ink)", color: "white",
            padding: "1rem", cursor: "pointer",
            transition: "opacity 0.1s",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/><line x1="14" y1="4" x2="10" y2="20"/>
              </svg>
              <span style={{ fontWeight: 600, fontSize: ".88rem" }}>Review &amp; Earn POT</span>
            </div>
            <p style={{ margin: 0, fontSize: ".78rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              Browse open review jobs, stake reputation, submit security findings, earn rewards.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatTile({
  label, value, suffix, hint, dotColor, trend, tier,
}: {
  label: string; value: string; suffix?: string; hint?: string;
  dotColor?: string; trend?: number; tier?: string;
}) {
  return (
    <div className="glass-card" style={{ padding: "1rem 1.125rem", display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {dotColor && (
            <span className="dot-pulse" style={{ background: dotColor, color: dotColor }} />
          )}
          <span className="label-cap">{label}</span>
        </div>
        {trend != null && (
          <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".68rem", color: trend > 0 ? "var(--ok)" : "var(--danger)" }}>
            {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{
          fontFamily: "var(--font-mono,monospace)", fontSize: "1.625rem", fontWeight: 600,
          letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: "var(--ink)",
        }}>
          {value}
        </span>
        {suffix && <span style={{ fontSize: ".75rem", fontWeight: 500, color: "var(--ink-4)" }}>{suffix}</span>}
        {tier && (
          <span className={`chip tier-${tier.toLowerCase()}`} style={{ marginLeft: "auto" }}>{tier}</span>
        )}
      </div>
      {hint && <span style={{ fontSize: ".72rem", color: "var(--ink-4)" }}>{hint}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const { jobs, isLoading, hasMore, error, loadMore, refresh } = useReviewQueue();
  const { isConnected, selectedAccount } = useWallet();
  const { score } = useReputation(selectedAccount?.address ?? undefined);
  const { entries } = useLeaderboard();

  const isNewUser = isConnected && !score?.reviewsCompleted && !score?.slashCount && (!score || score.score === 0n);

  const openJobs    = jobs.filter((j) => j.status === "Open" || j.status === "InReview").length;
  const totalBounty = jobs.reduce((s, j) => s + j.stakeAmount / 1_000_000_000_000n, 0n);
  const stats = {
    jobCount:   jobs.length,
    activeJobs: openJobs,
    potStaked:  jobs
      .filter((j) => j.status !== "Cancelled")
      .reduce((s, j) => s + j.stakeAmount, 0n),
  };

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1400, margin: "0 auto" }}>

        {/* ── Welcome card (new users only) ── */}
        {isNewUser && (
          <WelcomeCard onSubmit={() => {}} onReview={() => {}} />
        )}

        {/* ── Stat tiles ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatTile
            label="Open Jobs"
            value={String(openJobs)}
            suffix="awaiting review"
            dotColor="#38bdf8"
          />
          <StatTile
            label="Total Bounty Pool"
            value={totalBounty.toLocaleString()}
            suffix="POT"
            dotColor="var(--ink)"
            hint={`${stats.jobCount} total jobs`}
          />
          <StatTile
            label="Reputation"
            value={score ? score.score.toLocaleString() : "—"}
            tier={score?.tier}
            hint={score ? `${score.reviewsCompleted} reviews · ${score.slashCount} slash events` : "Connect wallet"}
          />
          <StatTile
            label="Top Reviewer"
            value={entries[0] ? entries[0].score.toLocaleString() : "—"}
            suffix="REP"
            dotColor="#22c55e"
            hint={entries[0] ? `${entries[0].reviewsCompleted} reviews completed` : ""}
          />
        </div>

        {/* ── Two column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16 }}>

          {/* LEFT — active review jobs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ margin: "0 0 2px", fontSize: "1.05rem", fontWeight: 600, color: "var(--ink)" }}>
                  Active review jobs
                </h2>
                <span style={{ fontSize: ".75rem", color: "var(--ink-4)" }}>
                  Pick a job, stake, file findings, earn POT.
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>
            </div>

            <ReviewQueue
              jobs={jobs}
              isLoading={isLoading}
              hasMore={hasMore}
              error={error}
              onLoadMore={loadMore}
              onRefresh={refresh}
            />
          </div>

          {/* RIGHT — activity rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Claimable rewards (ink-black card) */}
            <div style={{
              padding: "1.25rem",
              background: "var(--ink)",
              color: "white",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                <span className="dot-pulse" style={{ background: "var(--accent)", color: "var(--accent)" }} />
                <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".66rem", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>
                  Claimable rewards
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "-.03em", lineHeight: 1 }}>
                  0
                </span>
                <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".72rem", color: "rgba(255,255,255,0.5)" }}>
                  POT · no finalized jobs yet
                </span>
              </div>
              <Link href="/review">
                <button className="btn btn-primary" style={{ width: "100%" }}>
                  Browse review jobs
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
                  </svg>
                </button>
              </Link>
            </div>

            {/* Protocol stats */}
            <div className="glass-card" style={{ padding: "1.125rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>Protocol stats</span>
                <span className="chip chip-slate" style={{ fontFamily: "var(--font-mono,monospace)" }}>
                  {stats.jobCount}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Total jobs", value: stats.jobCount.toString() },
                  { label: "Active jobs", value: stats.activeJobs.toString() },
                  { label: "POT staked", value: formatBalance(stats.potStaked, 0) },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: "grid", gridTemplateColumns: "1fr auto",
                    alignItems: "center", gap: 10,
                    padding: "0.55rem 0",
                    borderBottom: "1px dashed var(--line)",
                  }}>
                    <span style={{ fontSize: ".78rem", color: "var(--ink-3)" }}>{row.label}</span>
                    <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top reviewers snapshot */}
            {entries.length > 0 && (
              <div className="glass-card" style={{ padding: "1.125rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>Top reviewers</span>
                  <Link href="/leaderboard" style={{ fontSize: ".72rem", color: "var(--ink-4)", textDecoration: "none" }}>
                    View all →
                  </Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {entries.slice(0, 3).map((e, i) => (
                    <div key={e.address} style={{ display: "grid", gridTemplateColumns: "auto auto 1fr auto", gap: 10, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".72rem", color: "var(--ink-4)", width: 20 }}>
                        #{i + 1}
                      </span>
                      <span className="avatar" style={{ width: 22, height: 22, fontSize: ".55rem" }}>
                        {e.address.slice(2, 4).toUpperCase()}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".75rem", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.address.slice(0, 6)}…{e.address.slice(-4)}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".78rem", fontWeight: 600, color: "var(--ink)" }}>
                        {e.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Protocol announcement */}
            <div style={{
              padding: "0.875rem 1rem",
              background: "var(--paper)",
              border: "1px solid var(--line-2)",
              borderLeft: "3px solid var(--accent)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2, color: "var(--ink)" }}>
                  <circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/>
                </svg>
                <div style={{ fontSize: ".78rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
                  <span style={{ fontWeight: 600 }}>Protocol v0.4 deployed. </span>
                  <span style={{ color: "var(--ink-3)" }}>Quorum reduced to 2-of-3 for jobs under 200 lines. </span>
                  <a href="#" style={{ fontWeight: 600, color: "var(--ink)" }}>Read changelog →</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
