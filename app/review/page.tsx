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
