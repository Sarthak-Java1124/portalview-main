"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StakeInput } from "@/components/staking/StakeInput";
import { TxStatusBanner } from "@/components/staking/TxStatusBanner";
import { useEscrow } from "@/hooks/useEscrow";
import { useWallet } from "@/hooks/useWallet";
import { useToastContext } from "@/context/ToastContext";
import { IS_LIVE_MODE } from "@/lib/constants";
import { DevFaucet } from "@/components/dev/DevFaucet";

// ── Preserved utilities ───────────────────────────────────────
function generateJobId(): string {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 9);
  return `job-${Date.now()}-${random}`;
}

interface GitHubInfo { owner: string; repo: string; subPath?: string; }

function parseGitHubUrl(raw: string): GitHubInfo | null {
  try {
    const u = new URL(raw.trim());
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo, , , ...rest] = parts;
    return { owner, repo, subPath: rest.length ? rest.join("/") : undefined };
  } catch { return null; }
}

async function computeSHA256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Icons ────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 12 10 18 20 6"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ── Step indicator ────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = [{ n: 1, label: "Upload" }, { n: 2, label: "Bounty" }, { n: 3, label: "Confirm" }];
  const items: React.ReactNode[] = [];
  steps.forEach((s, i) => {
    items.push(
      <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`step-dot ${current === s.n ? "step-dot-current" : current > s.n ? "step-dot-done" : ""}`}>
          {current > s.n ? <CheckIcon /> : s.n}
        </span>
        <span style={{ fontSize: ".82rem", fontWeight: 500, color: current >= s.n ? "var(--ink)" : "var(--ink-4)" }}>
          {s.label}
        </span>
      </div>
    );
    if (i < steps.length - 1) {
      items.push(
        <div key={`line-${s.n}`} className={`step-line ${current > s.n ? "step-line-done" : ""}`} style={{ flex: 1 }} />
      );
    }
  });
  return <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>{items}</div>;
}

// ── Window / quorum / tier constants ─────────────────────────
const WINDOWS = [
  { v: 4,  l: "4 hours",  hint: "Fast-track" },
  { v: 8,  l: "8 hours",  hint: "Standard" },
  { v: 24, l: "24 hours", hint: "Recommended" },
  { v: 72, l: "3 days",   hint: "Deep audit" },
];
const QUORUMS = [{ id: "2of3", l: "2 of 3" }, { id: "3of5", l: "3 of 5" }, { id: "5of7", l: "5 of 7" }];
const TIERS = ["Reviewer", "Senior", "Expert"] as const;

// ── Page ─────────────────────────────────────────────────────
export default function SubmitPage() {
  const { isConnected, connect } = useWallet();
  const { stake, status, txHash, blockHash, error, reset } = useEscrow();
  const { toast } = useToastContext();

  // step
  const [step, setStep] = useState(1);

  // step 1 state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; sizeKb: string; lines: string } | null>(null);
  const [hashInput, setHashInput] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const githubInfo = parseGitHubUrl(githubUrl);
  const [contractHash, setContractHash] = useState<string | null>(null);
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [description, setDescription] = useState("");

  // step 2 state
  const [stakeRaw, setStakeRaw] = useState("");
  const [stakePlanck, setStakePlanck] = useState(0n);
  const [window_, setWindow] = useState(8);
  const [quorum, setQuorum] = useState("2of3");
  const [tier, setTier] = useState("Senior");

  // validation
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSubmitting = status === "pending" || status === "broadcast" || status === "inBlock";

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!githubInfo) {
        setContractHash(null);
        setIsComputingHash(false);
        return;
      }
      setIsComputingHash(true);
      const hex = await computeSHA256(githubUrl.trim().toLowerCase());
      setContractHash(`0x${hex}`);
      setIsComputingHash(false);
    }, githubInfo ? 400 : 0);
    return () => clearTimeout(timer);
  }, [githubUrl, githubInfo]);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const hash = "0x" + Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    const text = new TextDecoder().decode(buf);
    const lines = text.split("\n").length;
    setFileInfo({
      name: file.name,
      sizeKb: (file.size / 1024).toFixed(1),
      lines: lines.toLocaleString(),
    });
    setContractHash(hash);
    setFileUploaded(true);
  };

  const canProceedStep1 = fileUploaded || !!hashInput.trim() || (!!githubInfo && !isComputingHash && !!contractHash);

  const handleSubmit = async () => {
    setValidationError(null);
    if (!description.trim()) { setValidationError("Contract description is required"); return; }
    if (description.trim().length < 20) { setValidationError("Description must be at least 20 characters"); return; }
    if (stakePlanck === 0n) { setValidationError("Stake amount must be greater than 0"); return; }

    const jobId = generateJobId();
    const finalHash = contractHash ?? `0x${hashInput}`;
    const finalUrl = githubUrl.trim() || hashInput;

    try {
      await stake(jobId, description.trim(), stakePlanck, finalUrl, finalHash);
      toast("Review job submitted successfully!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Submission failed", "error");
    }
  };

  const handleReset = () => {
    reset();
    setStep(1);
    setFileUploaded(false);
    setFileInfo(null);
    setHashInput("");
    setGithubUrl("");
    setContractHash(null);
    setDescription("");
    setStakeRaw("");
    setStakePlanck(0n);
    setWindow(8);
    setQuorum("2of3");
    setTier("Senior");
    setValidationError(null);
  };

  const fee = stakePlanck > 0n ? stakePlanck / 100n : 0n;
  const total = stakePlanck + fee;

  if (!isConnected) {
    return (
      <AppShell>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", paddingTop: 80 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)", margin: 0 }}>Connect your wallet</h2>
          <p style={{ fontSize: ".88rem", color: "var(--ink-4)", margin: 0 }}>
            You need a connected Polkadot wallet to submit contracts.
          </p>
          <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: "0 auto", paddingTop: 8 }}>
        {IS_LIVE_MODE && process.env.NODE_ENV === "development" && <DevFaucet />}
        <StepIndicator current={step} />

        <div className="glass-strong" style={{ padding: "1.75rem" }}>

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-.015em" }}>
                  Upload your contract
                </h2>
                <p style={{ margin: 0, fontSize: ".88rem", color: "var(--ink-3)" }}>
                  Drop a compiled <span style={{ fontFamily: "var(--font-mono,monospace)", background: "var(--accent-soft)", padding: "0 4px" }}>.contract</span> bundle, or paste a GitHub URL / on-chain hash.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".contract,.json,.wasm"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {!fileUploaded ? (
                <div
                  className={`dropzone ${dragging ? "dropzone-dragging" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{
                    width: 52, height: 52, margin: "0 auto 14px",
                    background: "var(--accent)", border: "1px solid var(--ink)",
                    display: "grid", placeItems: "center", color: "var(--ink)",
                  }}>
                    <UploadIcon />
                  </div>
                  <div style={{ fontSize: ".95rem", fontWeight: 500, marginBottom: 4 }}>Drop .contract file here</div>
                  <div style={{ fontSize: ".78rem", color: "var(--ink-4)" }}>or click to browse · max 2MB · compiled WASM + metadata</div>
                </div>
              ) : (
                <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 14, border: "1px solid var(--ink)", background: "var(--background)" }}>
                  <div style={{ width: 44, height: 44, background: "var(--ok)", border: "1px solid var(--ink)", display: "grid", placeItems: "center", color: "white" }}>
                    <CheckIcon />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".95rem", fontWeight: 600 }}>
                        {fileInfo?.name ?? "file.contract"}
                      </span>
                      {fileInfo && (
                        <span style={{ fontSize: ".72rem", color: "var(--ink-4)" }}>
                          {fileInfo.sizeKb} KB · {fileInfo.lines} lines
                        </span>
                      )}
                    </div>
                    {contractHash && (
                      <div style={{ fontSize: ".72rem", color: "var(--ink-4)", marginTop: 4, fontFamily: "var(--font-mono,monospace)" }}>
                        <span style={{ color: "var(--ink-5)" }}>sha256: </span>
                        <span style={{ color: "var(--ink)" }}>{contractHash.slice(0, 20)}…</span>
                      </div>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFileUploaded(false); setFileInfo(null); setContractHash(null); }}>Replace</button>
                </div>
              )}

              {/* OR divider */}
              <div style={{ position: "relative", textAlign: "center", margin: "4px 0" }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--line)" }} />
                <span style={{
                  position: "relative", background: "var(--bg-elevated)", padding: "0 0.75rem",
                  fontSize: ".7rem", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-4)",
                }}>or</span>
              </div>

              {/* GitHub URL / hash paste */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <label className="label-cap">GitHub URL or contract hash</label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: ".68rem", padding: "0.15rem 0.45rem", color: "var(--ink-4)", border: "none" }}
                    onClick={() => { setGithubUrl("https://github.com/Sarthak-Java1124/nft-minting-contract"); setHashInput(""); }}
                  >
                    Try example ↗
                  </button>
                </div>
                <input
                  className="glass-input"
                  style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem" }}
                  placeholder="https://github.com/owner/repo  or  0x9c2f4b1e…"
                  value={githubUrl || hashInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.startsWith("http")) { setGithubUrl(v); setHashInput(""); }
                    else { setHashInput(v); setGithubUrl(""); }
                  }}
                />
                {githubInfo && (
                  <div style={{ marginTop: 6, fontSize: ".75rem", color: "var(--ink-3)", display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono,monospace)" }}>{githubInfo.owner}/{githubInfo.repo}</span>
                    {isComputingHash ? (
                      <span style={{ color: "var(--ink-4)" }}>Computing hash…</span>
                    ) : contractHash ? (
                      <span style={{ fontFamily: "var(--font-mono,monospace)", color: "var(--ink-5)" }}>{contractHash.slice(0, 18)}…</span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <label className="label-cap">Contract description</label>
                  <span style={{ fontSize: ".68rem", color: "var(--ink-4)" }}>{description.length}/1000</span>
                </div>
                <textarea
                  className="glass-input"
                  rows={4}
                  placeholder="Describe your contract's purpose, key functions, and what reviewers should focus on…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  style={{ resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Bounty ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-.015em" }}>
                  Set bounty & review window
                </h2>
                <p style={{ margin: 0, fontSize: ".88rem", color: "var(--ink-3)" }}>
                  Higher bounties attract higher-tier reviewers. Bounty is locked in escrow until the job finalizes.
                </p>
              </div>

              <StakeInput
                value={stakeRaw}
                onChange={(raw, planck) => { setStakeRaw(raw); setStakePlanck(planck); }}
                min="100"
                label="POT Bounty"
                disabled={isSubmitting}
              />

              {/* Review window */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className="label-cap">Review window</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {WINDOWS.map((w) => (
                    <button
                      key={w.v}
                      className={`filter-chip ${window_ === w.v ? "is-active" : ""}`}
                      onClick={() => setWindow(w.v)}
                      style={{ flexDirection: "column", padding: "0.625rem", gap: 2, height: "auto" }}
                    >
                      <span style={{ fontWeight: 600 }}>{w.l}</span>
                      <span style={{ fontSize: ".68rem", color: window_ === w.v ? "rgba(255,255,255,0.7)" : "var(--ink-4)", letterSpacing: 0 }}>{w.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quorum & tier */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className="label-cap">Reviewer quorum & tier</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="glass-card" style={{ padding: "0.75rem 0.875rem" }}>
                    <div style={{ fontSize: ".65rem", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-4)", marginBottom: 6 }}>Quorum</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {QUORUMS.map((q) => (
                        <button
                          key={q.id}
                          className={`filter-chip ${quorum === q.id ? "is-active" : ""}`}
                          onClick={() => setQuorum(q.id)}
                          style={{ flex: 1, fontSize: ".75rem" }}
                        >
                          {q.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card" style={{ padding: "0.75rem 0.875rem" }}>
                    <div style={{ fontSize: ".65rem", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-4)", marginBottom: 6 }}>Min tier</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {TIERS.map((t) => (
                        <button
                          key={t}
                          className={`filter-chip ${tier === t ? "is-active" : ""}`}
                          onClick={() => setTier(t)}
                          style={{ flex: 1, fontSize: ".75rem" }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {stakePlanck > 0n && stakePlanck < 100n * 1_000_000_000_000n && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".78rem", color: "var(--warn)" }}>
                  <AlertIcon /> Bounty must be at least 100 POT.
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button
                  className="btn btn-primary"
                  onClick={() => { setValidationError(null); setStep(3); }}
                  disabled={stakePlanck < 100n * 1_000_000_000_000n}
                >
                  Continue <ArrowRight />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-.015em" }}>
                  {status === "finalized" ? "Job created" : "Confirm & stake"}
                </h2>
                <p style={{ margin: 0, fontSize: ".88rem", color: "var(--ink-3)" }}>
                  {status === "finalized"
                    ? "Your contract is now in the review queue. Reviewers are being notified."
                    : "Review the summary. Once signed, your stake is locked in escrow until finalization."}
                </p>
              </div>

              {/* Summary table */}
              <div className="glass-card" style={{ padding: "1.125rem 1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { k: "Contract", v: fileUploaded ? (fileInfo?.name ?? "file.contract") : (githubInfo ? `${githubInfo.owner}/${githubInfo.repo}` : hashInput), mono: true },
                    { k: "Hash",     v: contractHash ? contractHash.slice(0, 22) + "…" : hashInput || "—", mono: true },
                    { k: "Window",   v: window_ < 24 ? `${window_} hours` : `${window_ / 24} day${window_ > 24 ? "s" : ""}` },
                    { k: "Quorum",   v: quorum.replace("of", " of ") + ` · ${tier} tier or above` },
                    { k: "Bounty",   v: `${(stakePlanck / 1_000_000_000_000n).toLocaleString()} POT`, accent: true },
                    { k: "Protocol fee", v: `${(fee / 1_000_000_000_000n).toString()} POT (1%)`, mono: true },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "baseline" }}>
                      <span style={{ fontSize: ".75rem", color: "var(--ink-4)" }}>{r.k}</span>
                      <span style={{
                        fontSize: r.accent ? "1.125rem" : ".85rem",
                        fontWeight: r.accent ? 600 : 500,
                        color: "var(--ink)",
                        fontFamily: (r.mono || r.accent) ? "var(--font-mono,monospace)" : "inherit",
                        textAlign: "right",
                      }}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "baseline" }}>
                    <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink-2)" }}>Total to stake</span>
                    <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: "1.25rem", fontWeight: 600, textAlign: "right", color: "var(--ink)" }}>
                      {(total / 1_000_000_000_000n).toLocaleString()} <span style={{ fontSize: ".75rem", fontWeight: 500, color: "var(--ink-4)" }}>POT</span>
                    </span>
                  </div>
                </div>
              </div>

              <TxStatusBanner
                status={status}
                txHash={txHash}
                blockHash={blockHash}
                error={error}
                onReset={handleReset}
              />

              {validationError && (
                <p style={{ fontSize: ".78rem", color: "var(--danger)", margin: 0 }}>{validationError}</p>
              )}

              {status === "idle" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isComputingHash}
                    style={{ minWidth: 220 }}
                  >
                    <LockIcon /> Sign & stake {(total / 1_000_000_000_000n).toLocaleString()} POT
                  </button>
                </div>
              )}

              {isSubmitting && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button className="btn btn-ghost" disabled>Waiting for finalization…</button>
                </div>
              )}

              {status === "finalized" && (
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={handleReset}>Submit another</button>
                  <Link href="/dashboard">
                    <button className="btn btn-primary">
                      View job in dashboard <ArrowRight />
                    </button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
