"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { useReputation } from "@/hooks/useReputation";
import { useWallet } from "@/hooks/useWallet";

type SortKey = "bounty" | "closing" | "newest";
const TIER_FILTER_OPTIONS = ["All", "Senior", "Expert", "Legend"] as const;
type TierFilter = typeof TIER_FILTER_OPTIONS[number];

export default function ReviewPage() {
  const { isConnected, connect, selectedAccount } = useWallet();
  const { jobs, isLoading, hasMore, error, loadMore, refresh } = useReviewQueue();
  const { score } = useReputation(selectedAccount?.address);

  const [sort, setSort] = useState<SortKey>("bounty");
  const [tierFilter, setTierFilter] = useState<TierFilter>("All");

  const activeJobs = jobs.filter((j) => j.status === "Open" || j.status === "InReview");
  const pooledBounty = activeJobs.reduce((s, j) => s + j.stakeAmount / 1_000_000_000_000n, 0n);

  const sortedJobs = useMemo(() => {
    const copy = [...jobs];
    if (sort === "bounty")   copy.sort((a, b) => (b.stakeAmount > a.stakeAmount ? 1 : -1));
    if (sort === "closing")  copy.sort((a, b) => a.closesAtBlock - b.closesAtBlock);
    if (sort === "newest")   copy.sort((a, b) => b.openedAtBlock - a.openedAtBlock);
    return copy;
  }, [jobs, sort]);

  return (
    <AppShell>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Reviewer explainer ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
          border: "1px solid var(--line)", background: "var(--bg-elevated)",
        }}>
          {[
            {
              step: "01", title: "Browse jobs",
              text: "Open jobs show the bounty, description, and required reviewer tier.",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              ),
            },
            {
              step: "02", title: "Open a job",
              text: "Click into a job you can review. Your reputation must meet the minimum tier.",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/>
                </svg>
              ),
            },
            {
              step: "03", title: "File findings",
              text: "Stake your reviewer bond and submit a finding with severity, title, and description.",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              ),
            },
            {
              step: "04", title: "Earn rewards",
              text: "2-of-3 confirmation by Senior+ reviewers validates the finding. You earn POT + reputation.",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4h10v4a5 5 0 1 1-10 0V4Z"/>
                </svg>
              ),
            },
          ].map((item, i) => (
            <div
              key={item.step}
              style={{
                padding: "0.875rem 1rem",
                borderLeft: i > 0 ? "1px solid var(--line)" : "none",
                display: "flex", flexDirection: "column", gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{
                  width: 20, height: 20, display: "grid", placeItems: "center",
                  background: "var(--accent)", border: "1px solid var(--ink)", flexShrink: 0,
                  color: "var(--ink)",
                }}>
                  {item.icon}
                </span>
                <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".6rem", fontWeight: 700, color: "var(--ink-4)", letterSpacing: ".06em" }}>
                  STEP {item.step}
                </span>
              </div>
              <div style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--ink)" }}>{item.title}</div>
              <div style={{ fontSize: ".74rem", color: "var(--ink-4)", lineHeight: 1.55 }}>{item.text}</div>
            </div>
          ))}
        </div>

        {/* Top control bar */}
        <div className="glass-card" style={{ padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>Find jobs to review</div>
            <div style={{ fontSize: ".74rem", color: "var(--ink-4)" }}>
              {activeJobs.length} active jobs · pooled bounty{" "}
              <span style={{ fontFamily: "var(--font-mono,monospace)", color: "var(--ink)", fontWeight: 600 }}>
                {pooledBounty.toLocaleString()} POT
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: ".72rem", color: "var(--ink-4)", marginRight: 2 }}>Sort</span>
            {(["bounty", "closing", "newest"] as SortKey[]).map((s) => (
              <button
                key={s}
                className={`filter-chip ${sort === s ? "is-active" : ""}`}
                onClick={() => setSort(s)}
              >
                {s === "bounty" ? "Bounty" : s === "closing" ? "Closing soon" : "Newest"}
              </button>
            ))}

            <div style={{ width: 1, height: 20, background: "var(--line-2)", margin: "0 4px" }} />

            <span style={{ fontSize: ".72rem", color: "var(--ink-4)", marginRight: 2 }}>Tier</span>
            {TIER_FILTER_OPTIONS.map((t) => (
              <button
                key={t}
                className={`filter-chip ${tierFilter === t ? "is-active" : ""}`}
                onClick={() => setTierFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Wallet + reputation warning */}
        {!isConnected && (
          <div className="glass-card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderLeft: "3px solid var(--accent)" }}>
            <p style={{ fontSize: ".85rem", color: "var(--ink-3)", margin: 0 }}>
              Connect your wallet to stake on findings and earn POT rewards.
            </p>
            <button className="btn btn-primary btn-sm" onClick={connect}>Connect Wallet</button>
          </div>
        )}

        {isConnected && score && score.score < 100n && (
          <div className="glass-card" style={{ padding: "1rem 1.25rem", borderLeft: "3px solid var(--warn)" }}>
            <p style={{ fontSize: ".85rem", color: "var(--warn)", margin: 0 }}>
              You need at least 100 reputation to submit findings. Review jobs are still visible below.
            </p>
          </div>
        )}

        {/* Queue */}
        <ReviewQueue
          jobs={sortedJobs}
          isLoading={isLoading}
          hasMore={hasMore}
          error={error}
          onLoadMore={loadMore}
          onRefresh={refresh}
          showFilterBar={false}
        />
      </div>
    </AppShell>
  );
}
