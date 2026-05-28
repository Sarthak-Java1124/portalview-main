"use client";

import { useState, useMemo } from "react";
import { ReviewCard } from "./ReviewCard";
import { Spinner } from "@/components/ui/Spinner";
import type { ReviewJob } from "@/types/review.types";

const FILTERS = [
  { id: "all",       label: "All" },
  { id: "Open",      label: "Open" },
  { id: "InReview",  label: "In review" },
  { id: "Consensus", label: "Consensus" },
  { id: "Finalized", label: "Finalized" },
] as const;

interface ReviewQueueProps {
  jobs: ReviewJob[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  onRefresh: () => void;
  showFilterBar?: boolean;
}

export function ReviewQueue({ jobs, isLoading, hasMore, error, onLoadMore, onRefresh, showFilterBar = true }: ReviewQueueProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  if (isLoading && jobs.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 0", gap: 12 }}>
        <Spinner size="lg" />
        <p style={{ fontSize: ".85rem", color: "var(--ink-4)" }}>Loading review queue…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "5rem 0", gap: 12 }}>
        <p style={{ fontSize: ".85rem", color: "var(--danger)" }}>{error}</p>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showFilterBar && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${filter === f.id ? "is-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: ".85rem", color: "var(--ink-4)" }}>No jobs match this filter.</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={onRefresh}>Refresh</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((job, i) => (
          <div key={job.id} className={`fade-up fade-up-${Math.min(i + 1, 4)}`}>
            <ReviewCard job={job} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <button className="btn btn-ghost" onClick={onLoadMore} disabled={!hasMore || isLoading}>
            {isLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
