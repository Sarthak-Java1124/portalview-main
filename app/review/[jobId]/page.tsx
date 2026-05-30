"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ConsensusBar } from "@/components/review/ConsensusBar";
import { FindingForm } from "@/components/review/FindingForm";
import { ReputationBadge } from "@/components/reputation/ReputationBadge";
import { Spinner } from "@/components/ui/Spinner";
import { useReviewEngine } from "@/hooks/useReviewEngine";
import { useEscrow } from "@/hooks/useEscrow";
import { useReputation } from "@/hooks/useReputation";
import { useWallet } from "@/hooks/useWallet";
import { useApi } from "@/hooks/useApi";
import { useJob } from "@/hooks/useJob";
import { useToastContext } from "@/context/ToastContext";
import { formatAddress } from "@/lib/format";
import { MIN_REVIEWER_REPUTATION, USE_LIVE_TXS } from "@/lib/constants";
import type { FindingSeverity } from "@/types/review.types";

// ── Severity → chip class ─────────────────────────────────────
const SEV_CHIP: Record<FindingSeverity, string> = {
  Critical:      "chip-rose",
  High:          "chip-amber",
  Medium:        "chip-amber",
  Low:           "chip-slate",
  Informational: "chip-slate",
};

const SEV_LABEL: Record<FindingSeverity, string> = {
  Critical:      "CRIT",
  High:          "HIGH",
  Medium:        "MED",
  Low:           "LOW",
  Informational: "INFO",
};

// ── Status → chip class ───────────────────────────────────────
function statusChip(status: string) {
  if (status === "Open" || status === "Staked") return "chip-violet";
  if (status === "InReview")                    return "chip-amber";
  if (status === "Consensus")                   return "chip-amber";
  if (status === "Finalized" || status === "Released") return "chip-emerald";
  return "chip-slate";
}

// ── Job ID → readable title ───────────────────────────────────
function titleFromId(id: string) {
  return id
    .replace(/^job-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Block time formatter ──────────────────────────────────────
function formatBlocksRemaining(blocks: number): string {
  if (blocks <= 0) return "Closed";
  const secs = blocks * 2;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 24) return `~${Math.ceil(h / 24)}d`;
  if (h > 0) return `~${h}h ${m}m`;
  return `~${m}m`;
}

// ── Page ─────────────────────────────────────────────────────
interface Params { params: Promise<{ jobId: string }>; }

export default function JobDetailPage({ params }: Params) {
  const { jobId } = use(params);
  const { isConnected, selectedAccount } = useWallet();
  const { api } = useApi();
  const { toast } = useToastContext();

  const {
    consensus, findings, isLoading,
    submitFinding, refetchConsensus, refetchFindings,
    txStatus, txError, txHash, resetTx,
  } = useReviewEngine(jobId);

  const { escrowState, refetchState } = useEscrow();
  const { score } = useReputation(selectedAccount?.address);
  const { job } = useJob(jobId);

  // Live: subscribe to current block number to compute time remaining
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const blockUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!USE_LIVE_TXS || !api) return;
    (async () => {
      blockUnsubRef.current = (await (api.derive as unknown as {
        chain: { bestNumber: (cb: (n: unknown) => void) => Promise<() => void> }
      }).chain.bestNumber((n: unknown) => {
        setCurrentBlock(Number(n?.toString?.() ?? "0"));
      })) as () => void;
    })();
    return () => { blockUnsubRef.current?.(); };
  }, [api]);

  useEffect(() => { if (jobId) refetchState(jobId); }, [jobId, refetchState]);

  const meetsMinimum = score ? score.score >= MIN_REVIEWER_REPUTATION : false;

  const handleSubmitFinding = async (
    id: string,
    severity: FindingSeverity,
    title: string,
    description: string
  ) => {
    try {
      const hash = await submitFinding(id, severity, title, description);
      toast("Finding submitted!", "success");
      await Promise.all([refetchConsensus(id), refetchFindings(id)]);
      return hash;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Submission failed", "error");
      throw err;
    }
  };

  const jobTitle     = job?.description
    ? job.description.slice(0, 60) + (job.description.length > 60 ? "…" : "")
    : titleFromId(jobId);
  const bountyPOT    = escrowState ? escrowState.amount / 1_000_000_000_000n : 0n;
  const criticalCount = findings.filter((f) => f.severity === "Critical").length;
  const amberCount    = findings.filter((f) => f.severity === "High" || f.severity === "Medium").length;

  // Time remaining
  const closesAt = job?.closesAtBlock ?? escrowState?.openedAtBlock;
  let timeLabel = "—";
  if (closesAt) {
    if (USE_LIVE_TXS && currentBlock !== null) {
      timeLabel = formatBlocksRemaining(closesAt - currentBlock);
    } else if (job?.closesAtBlock && job?.openedAtBlock) {
      // Mock: show window length (we don't know current block exactly)
      const windowBlocks = job.closesAtBlock - job.openedAtBlock;
      timeLabel = `${formatBlocksRemaining(windowBlocks)} window`;
    }
  }

  // Contract hash display
  const contractHash = job?.contractHash ?? escrowState?.jobId ?? "";
  const shortHash = contractHash.length > 18
    ? `${contractHash.slice(0, 10)}…${contractHash.slice(-6)}`
    : contractHash;

  return (
    <AppShell>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>

        {/* ── Full-width header card ── */}
        <div className="glass-strong" style={{ padding: "1rem 1.25rem", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <Link href="/review" style={{ textDecoration: "none" }}>
              <button className="btn btn-ghost btn-sm">← Queue</button>
            </Link>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ink)" }}>{jobTitle}</span>
                <span className={`chip ${statusChip(escrowState?.status ?? job?.status ?? "")}`}>
                  {escrowState?.status ?? job?.status ?? "—"}
                </span>
                <span className="chip chip-slate" style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".62rem" }}>ink!</span>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: ".72rem", color: "var(--ink-3)", flexWrap: "wrap" }}>
                {escrowState?.submitter && (
                  <span>Submitted by <span style={{ fontFamily: "var(--font-mono,monospace)" }}>{formatAddress(escrowState.submitter, 6)}</span></span>
                )}
                <span style={{ fontFamily: "var(--font-mono,monospace)", color: "var(--ink-5)" }}>{shortHash}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1, letterSpacing: "-.02em" }}>
                {bountyPOT.toLocaleString()}
              </div>
              <div style={{ fontSize: ".66rem", letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-4)" }}>POT BOUNTY</div>
            </div>
            <div style={{ width: 1, height: 32, background: "var(--line-2)" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                {timeLabel}
              </div>
              <div style={{ fontSize: ".66rem", letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                {USE_LIVE_TXS && currentBlock !== null ? "LEFT" : "WINDOW"}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2-column workspace ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, alignItems: "flex-start" }}>

          {/* LEFT — Contract info panel */}
          <div className="glass-strong" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.6rem 1rem", borderBottom: "1px solid var(--line)", background: "var(--bg-elevated)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-4)" }}>
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".78rem", color: "var(--ink)" }}>Contract</span>
                <span className="chip chip-slate" style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".6rem" }}>ink!</span>
              </div>
              {job?.githubUrl && (
                <a
                  href={job.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  View on GitHub
                </a>
              )}
            </div>

            {/* Contract body */}
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Description */}
              {job?.description ? (
                <div>
                  <div className="label-cap" style={{ marginBottom: 8 }}>Description</div>
                  <p style={{ margin: 0, fontSize: ".88rem", color: "var(--ink-2)", lineHeight: 1.65 }}>
                    {job.description}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "center", padding: "1rem 0" }}>
                  <Spinner size="sm" />
                </div>
              )}

              {/* Hash */}
              <div>
                <div className="label-cap" style={{ marginBottom: 8 }}>Contract hash</div>
                <div style={{
                  fontFamily: "var(--font-mono,monospace)", fontSize: ".8rem", padding: "0.6rem 0.75rem",
                  background: "var(--bg-sunken)", border: "1px solid var(--line)", wordBreak: "break-all",
                  color: "var(--ink-2)", lineHeight: 1.5,
                }}>
                  {contractHash || "—"}
                </div>
              </div>

              {/* GitHub link (if set) */}
              {job?.githubUrl && (
                <div>
                  <div className="label-cap" style={{ marginBottom: 8 }}>Source repository</div>
                  <a
                    href={job.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "var(--font-mono,monospace)", fontSize: ".8rem",
                      color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {job.githubUrl}
                  </a>
                </div>
              )}

              {/* Block range */}
              {job && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Opened at block", value: `#${job.openedAtBlock.toLocaleString()}` },
                    { label: "Closes at block",  value: `#${job.closesAtBlock.toLocaleString()}` },
                  ].map((r) => (
                    <div key={r.label} style={{ padding: "0.625rem 0.75rem", background: "var(--bg-elevated)", border: "1px solid var(--line)" }}>
                      <div className="label-cap" style={{ marginBottom: 4 }}>{r.label}</div>
                      <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".85rem", fontWeight: 600, color: "var(--ink)" }}>
                        {r.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.45rem 1rem", borderTop: "1px solid var(--line)",
              background: "var(--bg-elevated)", fontSize: ".66rem",
            }}>
              <span style={{ fontFamily: "var(--font-mono,monospace)", color: "var(--ink-4)" }}>
                {findings.length} findings filed
              </span>
              <div style={{ display: "flex", gap: 12, color: "var(--ink-3)" }}>
                {criticalCount > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)", display: "inline-block" }} />
                    {criticalCount} critical
                  </span>
                )}
                {amberCount > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warn)", display: "inline-block" }} />
                    {amberCount} amber
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Finding panel + findings list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Finding submission card */}
            <div className="glass-strong" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--ink)" }}>Submit finding</h3>
                <span className="chip chip-violet">FINDING #{findings.length + 1}</span>
              </div>

              {!isConnected ? (
                <p style={{ fontSize: ".85rem", color: "var(--ink-4)", textAlign: "center", padding: "1rem 0" }}>
                  Connect your wallet to submit findings.
                </p>
              ) : !meetsMinimum ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "1rem 0", textAlign: "center" }}>
                  {score && <ReputationBadge score={score.score} address={score.address} tier={score.tier} />}
                  <p style={{ fontSize: ".85rem", color: "var(--warn)", margin: 0 }}>
                    You need {MIN_REVIEWER_REPUTATION.toLocaleString()} reputation to submit findings.
                  </p>
                  <p style={{ fontSize: ".78rem", color: "var(--ink-4)", margin: 0 }}>
                    Current: {score?.score.toLocaleString() ?? "0"} pts
                  </p>
                </div>
              ) : (
                <FindingForm
                  jobId={jobId}
                  txStatus={txStatus}
                  txHash={txHash}
                  txError={txError}
                  onSubmit={handleSubmitFinding}
                  onReset={resetTx}
                />
              )}

              {/* Consensus block */}
              {consensus && (
                <div style={{ marginTop: 16, padding: "0.75rem 0.875rem", background: "var(--paper)", border: "1px solid var(--line-2)", borderLeft: "3px solid var(--accent)" }}>
                  <ConsensusBar consensus={consensus} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: ".7rem" }}>
                    <span style={{ color: "var(--ink-4)" }}>
                      {consensus.confirmedFindings} of {consensus.threshold} required · {consensus.totalFindings} total findings
                    </span>
                    {consensus.reached && (
                      <span style={{ color: "var(--ok)", fontWeight: 600 }}>✓ Consensus reached</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Other findings */}
            <div className="glass-card" style={{ padding: "1rem 1.125rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>Findings filed by others</span>
                <span className="chip chip-slate" style={{ fontFamily: "var(--font-mono,monospace)" }}>{findings.length}</span>
              </div>

              {isLoading && findings.length === 0 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem 0" }}>
                  <Spinner size="sm" />
                </div>
              )}

              {!isLoading && findings.length === 0 && (
                <p style={{ fontSize: ".82rem", color: "var(--ink-4)", textAlign: "center", padding: "1rem 0", margin: 0 }}>
                  No findings submitted yet.
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {findings.map((f) => (
                  <div key={f.id} style={{ padding: "0.625rem 0.75rem", background: "var(--bg-elevated)", border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className={`chip ${SEV_CHIP[f.severity]}`} style={{ fontSize: ".62rem" }}>
                          {SEV_LABEL[f.severity]}
                        </span>
                        {f.lineStart && (
                          <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".7rem", color: "var(--ink-4)" }}>
                            L{f.lineStart}{f.lineEnd && f.lineEnd !== f.lineStart ? `–${f.lineEnd}` : ""}
                          </span>
                        )}
                      </div>
                      <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".65rem", color: "var(--ink-4)" }}>
                        {formatAddress(f.reviewer, 6)} · #{f.submittedAtBlock.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: ".78rem", color: "var(--ink-3)", lineHeight: 1.5 }}>{f.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
