"use client";

import { use, useEffect, useState } from "react";
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
import { useToastContext } from "@/context/ToastContext";
import { formatAddress } from "@/lib/format";
import { MIN_REVIEWER_REPUTATION } from "@/lib/constants";
import type { FindingSeverity } from "@/types/review.types";

// ── Mock contract source lines ────────────────────────────────
const MOCK_SRC = [
  { n:  1, c: "#[ink::contract]",                      flag: null },
  { n:  2, c: "mod lending_pool {",                     flag: null },
  { n:  3, c: "    use ink::storage::Mapping;",         flag: null },
  { n:  4, c: "",                                        flag: null },
  { n:  5, c: "    #[ink(storage)]",                    flag: null },
  { n:  6, c: "    pub struct LendingPool {",            flag: null },
  { n:  7, c: "        total_supply: Balance,",          flag: null },
  { n:  8, c: "        balances: Mapping<AccountId, Balance>,", flag: null },
  { n:  9, c: "        borrowed: Mapping<AccountId, Balance>,", flag: null },
  { n: 10, c: "    }",                                  flag: null },
  { n: 11, c: "",                                        flag: null },
  { n: 12, c: "    impl LendingPool {",                 flag: null },
  { n: 13, c: "        #[ink(message, payable)]",        flag: null },
  { n: 14, c: "        pub fn deposit(&mut self) -> Result<(), Error> {", flag: null },
  { n: 15, c: "            let caller = self.env().caller();", flag: null },
  { n: 16, c: "            let value = self.env().transferred_value();", flag: null },
  { n: 17, c: "            let bal = self.balances.get(caller).unwrap_or(0);", flag: null },
  { n: 18, c: "            self.balances.insert(caller, &(bal + value));", flag: null },
  { n: 19, c: "            self.total_supply += value;",  flag: null },
  { n: 20, c: "            Ok(())",                      flag: null },
  { n: 21, c: "        }",                               flag: null },
  { n: 22, c: "        #[ink(message)]",                 flag: null },
  { n: 23, c: "        pub fn borrow(&mut self, amount: Balance) -> Result<(), Error> {", flag: "critical" },
  { n: 24, c: "            let caller = self.env().caller();", flag: "critical" },
  { n: 25, c: "            // external call BEFORE state mutation — reentrancy risk", flag: "critical" },
  { n: 26, c: "            token.transfer(caller, amount)?;", flag: "critical" },
  { n: 27, c: "            let existing = self.borrowed.get(caller).unwrap_or(0);", flag: null },
  { n: 28, c: "            self.borrowed.insert(caller, &(existing + amount));", flag: null },
  { n: 29, c: "            self.total_supply -= amount;", flag: "amber" },
  { n: 30, c: "            Ok(())",                      flag: null },
  { n: 31, c: "        }",                               flag: null },
  { n: 32, c: "    }",                                   flag: null },
  { n: 33, c: "}",                                       flag: null },
] as const;

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

// ── Status → chip class (handles both ReviewJobStatus and EscrowStatus) ──
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

// ── Code line component ───────────────────────────────────────
function CodeLine({ n, c, flag, highlighted, onClick }: {
  n: number; c: string; flag: string | null; highlighted: boolean; onClick: () => void;
}) {
  const borderColor = flag === "critical" ? "var(--danger)" : flag === "amber" ? "var(--warn)" : "transparent";
  const bgColor     = flag === "critical" ? "rgba(185,28,28,0.05)" : flag === "amber" ? "rgba(202,138,4,0.05)" : "transparent";
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        cursor: "pointer",
        outline: highlighted ? "1px solid var(--ink)" : "none",
        outlineOffset: -1,
        background: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        minHeight: 22,
      }}
    >
      <span style={{
        width: 48, minWidth: 48, textAlign: "right", paddingRight: 12, paddingLeft: 8,
        color: "var(--ink-5)", fontFamily: "var(--font-mono,monospace)", fontSize: ".75rem",
        lineHeight: "22px", borderRight: "1px solid var(--line)", userSelect: "none", flexShrink: 0,
      }}>
        {n}
      </span>
      <span style={{
        fontFamily: "var(--font-mono,monospace)", fontSize: ".78rem", lineHeight: "22px",
        paddingLeft: 16, paddingRight: 12, whiteSpace: "pre", color: "var(--ink-2)",
      }}>
        {c || " "}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
interface Params { params: Promise<{ jobId: string }>; }

export default function JobDetailPage({ params }: Params) {
  const { jobId } = use(params);
  const { isConnected, selectedAccount } = useWallet();
  const { toast } = useToastContext();

  const {
    consensus, findings, isLoading,
    submitFinding, refetchConsensus, refetchFindings,
    txStatus, txError, txHash, resetTx,
  } = useReviewEngine(jobId);

  const { escrowState, refetchState } = useEscrow();
  const { score } = useReputation(selectedAccount?.address);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

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

  const jobTitle    = titleFromId(jobId);
  const bountyPOT   = escrowState ? escrowState.amount / 1_000_000_000_000n : 0n;
  const criticalCount = findings.filter((f) => f.severity === "Critical").length;
  const amberCount    = findings.filter((f) => f.severity === "High" || f.severity === "Medium").length;

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
                <span className={`chip ${statusChip(escrowState?.status ?? "")}`}>
                  {escrowState?.status ?? "—"}
                </span>
                <span className="chip chip-slate" style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".62rem" }}>ink!</span>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: ".72rem", color: "var(--ink-3)" }}>
                {escrowState?.submitter && (
                  <>
                    <span style={{ fontFamily: "var(--font-mono,monospace)" }}>
                      {formatAddress(escrowState.submitter, 8)}
                    </span>
                    <span>Submitted by <span style={{ fontFamily: "var(--font-mono,monospace)" }}>{formatAddress(escrowState.submitter, 6)}</span></span>
                  </>
                )}
                <span>{MOCK_SRC.length} lines</span>
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
                ~4h 00m
              </div>
              <div style={{ fontSize: ".66rem", letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-4)" }}>LEFT</div>
            </div>
          </div>
        </div>

        {/* ── 2-column workspace ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, alignItems: "flex-start" }}>

          {/* LEFT — Code panel */}
          <div className="glass-strong" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Code toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.6rem 1rem", borderBottom: "1px solid var(--line)", background: "var(--bg-elevated)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-4)" }}>
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".78rem", color: "var(--ink)" }}>lib.rs</span>
                <span className="chip chip-slate" style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".6rem" }}>Rust · ink! v5</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: "0.3rem 0.55rem" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Find
                </button>
                <button className="btn btn-ghost btn-sm" style={{ padding: "0.3rem 0.55rem" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                </button>
                <button className="btn btn-ghost btn-sm" style={{ padding: "0.3rem 0.55rem" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Code body */}
            <div style={{ background: "var(--background)", maxHeight: 620, overflow: "auto" }}>
              {MOCK_SRC.map((line) => (
                <CodeLine
                  key={line.n}
                  n={line.n}
                  c={line.c}
                  flag={line.flag}
                  highlighted={highlightedLine === line.n}
                  onClick={() => setHighlightedLine(line.n === highlightedLine ? null : line.n)}
                />
              ))}
            </div>

            {/* Code footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.45rem 1rem", borderTop: "1px solid var(--line)",
              background: "var(--bg-elevated)", fontSize: ".66rem",
            }}>
              <span style={{ fontFamily: "var(--font-mono,monospace)", color: "var(--ink-4)" }}>
                UTF-8 · LF · {MOCK_SRC.length} lines
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
