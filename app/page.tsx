"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";
import { useApi } from "@/hooks/useApi";

const SUBMITTER_STEPS = [
  { n: "01", text: "Upload your compiled .contract file or paste a GitHub URL" },
  { n: "02", text: "Set a POT bounty — higher bounty attracts senior reviewers" },
  { n: "03", text: "Receive findings from reputation-staked auditors on-chain" },
  { n: "04", text: "Funds release when consensus is reached, revoked if unfounded" },
];

const REVIEWER_STEPS = [
  { n: "01", text: "Browse open jobs sorted by bounty, urgency, or tier match" },
  { n: "02", text: "Stake your reviewer bond and file security findings" },
  { n: "03", text: "Two other Senior+ reviewers confirm your finding (2-of-3)" },
  { n: "04", text: "Earn POT rewards and grow your on-chain reputation score" },
];

export default function LandingPage() {
  const { isConnected, isConnecting, connect } = useWallet();
  const { status } = useApi();

  return (
    <div className="min-h-screen flex flex-col bg-background text-ink">

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem",
        borderBottom: "1px solid var(--line)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: "1rem" }}>
          <div style={{
            width: 28, height: 28, display: "grid", placeItems: "center",
            background: "var(--accent)", border: "1px solid var(--ink)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4 6v6c0 4.5 3.4 8.5 8 9 4.6-.5 8-4.5 8-9V6l-8-3Z"/>
              <path d="M12 7v10"/><path d="M8 12h8"/>
            </svg>
          </div>
          PortalReview
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {status === "ready" && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".72rem", color: "var(--ok)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)", display: "inline-block" }} />
              Portaldot connected
            </span>
          )}
          {!isConnected ? (
            <Button variant="primary" size="sm" loading={isConnecting} onClick={connect}>
              Connect Wallet
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button variant="primary" size="sm">Open App</Button>
            </Link>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: "3.5rem 1.5rem 4rem", maxWidth: 900, margin: "0 auto", width: "100%" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }} className="fade-up">
          <span className="chip chip-violet" style={{ marginBottom: 16, display: "inline-flex" }}>
            Portaldot Online Mini Hackathon S1
          </span>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
            Peer Code Review
            <br />
            <span style={{ background: "var(--accent)", padding: "0 8px" }}>on-chain.</span>
          </h1>
          <p style={{ margin: "0 auto", maxWidth: 540, fontSize: ".95rem", color: "var(--ink-3)", lineHeight: 1.65 }}>
            Submit ink! contracts and receive reputation-staked security reviews,
            or audit contracts and earn POT — fully trustless, slash-protected.
          </p>
        </div>

        {/* ── Role cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "2.5rem" }} className="fade-up fade-up-1">

          {/* Submitter path */}
          <div style={{
            border: "1px solid var(--ink)",
            background: "var(--background)",
            display: "flex", flexDirection: "column",
            boxShadow: "4px 4px 0 var(--ink)",
          }}>
            <div style={{
              padding: "1.125rem 1.25rem",
              borderBottom: "1px solid var(--ink)",
              background: "var(--accent)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>
              </svg>
              <div>
                <div style={{ fontWeight: 700, fontSize: ".9rem" }}>I have a contract to audit</div>
                <div style={{ fontSize: ".72rem", color: "var(--ink-2)", marginTop: 1 }}>Submitter · Open a security review</div>
              </div>
            </div>
            <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {SUBMITTER_STEPS.map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", fontSize: ".68rem", fontWeight: 700,
                    color: "var(--ink-4)", width: 24, flexShrink: 0, paddingTop: 2,
                  }}>{s.n}</span>
                  <span style={{ fontSize: ".82rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{s.text}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--line)" }}>
              {isConnected ? (
                <Link href="/submit" style={{ display: "block" }}>
                  <Button variant="primary" size="lg" style={{ width: "100%" }}>
                    Submit a contract →
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" size="lg" loading={isConnecting} onClick={connect} style={{ width: "100%" }}>
                  Connect wallet to submit
                </Button>
              )}
            </div>
          </div>

          {/* Reviewer path */}
          <div style={{
            border: "1px solid var(--ink)",
            background: "var(--background)",
            display: "flex", flexDirection: "column",
            boxShadow: "4px 4px 0 var(--ink)",
          }}>
            <div style={{
              padding: "1.125rem 1.25rem",
              borderBottom: "1px solid var(--ink)",
              background: "var(--ink)",
              color: "white",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/><line x1="14" y1="4" x2="10" y2="20"/>
              </svg>
              <div>
                <div style={{ fontWeight: 700, fontSize: ".9rem" }}>I want to review &amp; earn</div>
                <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,0.55)", marginTop: 1 }}>Reviewer · Audit contracts, earn POT</div>
              </div>
            </div>
            <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {REVIEWER_STEPS.map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    fontFamily: "var(--font-mono,monospace)", fontSize: ".68rem", fontWeight: 700,
                    color: "var(--ink-4)", width: 24, flexShrink: 0, paddingTop: 2,
                  }}>{s.n}</span>
                  <span style={{ fontSize: ".82rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{s.text}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--line)" }}>
              {isConnected ? (
                <Link href="/review" style={{ display: "block" }}>
                  <Button variant="dark" size="lg" style={{ width: "100%" }}>
                    Browse open jobs →
                  </Button>
                </Link>
              ) : (
                <Button variant="dark" size="lg" loading={isConnecting} onClick={connect} style={{ width: "100%" }}>
                  Connect wallet to review
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Protocol mechanics strip ── */}
        <div className="fade-up fade-up-2" style={{
          border: "1px solid var(--line-2)",
          background: "var(--bg-elevated)",
          padding: "1.25rem 1.5rem",
        }}>
          <div style={{ fontSize: ".68rem", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-4)", marginBottom: 14 }}>
            How the protocol works
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
            {[
              { label: "Stake & Submit", text: "Submitters lock POT bounty in escrow when opening a review job." },
              { label: "Reviewers Bid",  text: "Reviewers with enough reputation stake their bond to claim the job." },
              { label: "2-of-3 Quorum",  text: "A finding needs confirmation from 2 of 3 senior reviewers to be valid." },
              { label: "Rewards & Slash", text: "Valid findings earn POT. False findings slash the reviewer's bond." },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  padding: "0 1.25rem",
                  borderLeft: i > 0 ? "1px solid var(--line)" : "none",
                }}
              >
                <div style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: ".75rem", color: "var(--ink-4)", lineHeight: 1.55 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: "1.25rem",
        borderTop: "1px solid var(--line)",
        fontSize: ".72rem", color: "var(--ink-5)",
      }}>
        PortalReview · Built on Portaldot · ink! smart contracts
      </footer>
    </div>
  );
}
