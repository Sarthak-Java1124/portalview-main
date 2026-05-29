"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useReputation } from "@/hooks/useReputation";
import { formatAddress } from "@/lib/format";
import type { UserIntent } from "@/types/auth.types";

const INTENT_OPTIONS: { id: UserIntent; label: string; desc: string; accent: boolean }[] = [
  { id: "submitter", label: "Submitter", desc: "I submit ink! contracts for security review", accent: true },
  { id: "reviewer",  label: "Reviewer",  desc: "I audit contracts and earn POT rewards",       accent: false },
  { id: "both",      label: "Both",      desc: "I submit contracts and review others",          accent: false },
];

const TIER_CHIP: Record<string, string> = {
  Legend: "tier-legend", Expert: "tier-expert", Senior: "tier-senior",
  Journeyman: "tier-journeyman", Apprentice: "tier-apprentice", Novice: "tier-novice",
};

function Field({
  label, value, onChange, placeholder, type = "text", disabled = false, rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label className="label-cap">{label}</label>
      {rows ? (
        <textarea
          className="glass-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          style={{ resize: "none" }}
        />
      ) : (
        <input
          className="glass-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={type !== "url" ? { fontFamily: "var(--font-mono,monospace)" } : {}}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, isLoading, updateProfile, signOut } = useAuth();
  const { isConnected, selectedAccount, connect } = useWallet();
  const { score } = useReputation(selectedAccount?.address);

  const [draft, setDraft] = useState<{
    username?: string;
    bio?: string;
    githubUrl?: string;
    intent?: UserIntent | null;
  }>({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const username  = draft.username  !== undefined ? draft.username  : (profile?.username   ?? "");
  const bio       = draft.bio       !== undefined ? draft.bio       : (profile?.bio        ?? "");
  const githubUrl = draft.githubUrl !== undefined ? draft.githubUrl : (profile?.github_url ?? "");
  const intent    = draft.intent    !== undefined ? draft.intent    : (profile?.intent     ?? null);

  const setUsername  = (v: string)            => setDraft(d => ({ ...d, username: v }));
  const setBio       = (v: string)            => setDraft(d => ({ ...d, bio: v }));
  const setGithubUrl = (v: string)            => setDraft(d => ({ ...d, githubUrl: v }));
  const setIntent    = (v: UserIntent | null) => setDraft(d => ({ ...d, intent: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateProfile({
        username:       username.trim() || null,
        bio:            bio.trim() || null,
        github_url:     githubUrl.trim() || null,
        intent,
        wallet_address: selectedAccount?.address ?? profile?.wallet_address ?? null,
      });
      setDraft({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div style={{
          maxWidth: 520, margin: "0 auto", textAlign: "center",
          paddingTop: 80, display: "flex", flexDirection: "column", gap: 16, alignItems: "center",
        }}>
          <div style={{
            width: 56, height: 56, display: "grid", placeItems: "center",
            background: "var(--bg-sunken)", border: "1px solid var(--line)",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-4)" }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)" }}>Sign in to view your profile</h2>
            <p style={{ margin: 0, fontSize: ".85rem", color: "var(--ink-4)", lineHeight: 1.6 }}>
              Create an account to track your review activity, set your intent, and link your wallet.
            </p>
          </div>
          <Link href="/auth">
            <button className="btn btn-primary">Sign In / Create Account</button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const initials = (profile?.username ?? user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Header card ── */}
        <div style={{
          border: "1px solid var(--ink)", background: "var(--background)",
          boxShadow: "4px 4px 0 var(--ink)",
          padding: "1.5rem",
          display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
        }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, display: "grid", placeItems: "center",
            background: "var(--accent)", border: "1px solid var(--ink)",
            fontFamily: "var(--font-mono,monospace)", fontSize: "1.25rem", fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>
                {profile?.username ?? "Unnamed"}
              </span>
              {profile?.intent && (
                <span className="chip chip-violet" style={{ fontSize: ".62rem" }}>
                  {profile.intent.toUpperCase()}
                </span>
              )}
              {score?.tier && (
                <span className={`chip ${TIER_CHIP[score.tier] ?? "chip-slate"}`} style={{ fontSize: ".62rem" }}>
                  {score.tier}
                </span>
              )}
            </div>
            <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".78rem", color: "var(--ink-4)", marginTop: 4 }}>
              {user.email}
            </div>
            {profile?.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".75rem", color: "var(--ink-3)", marginTop: 4, display: "inline-block" }}
              >
                {profile.github_url.replace("https://github.com/", "github.com/")}
              </a>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className="btn btn-ghost btn-sm"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, alignItems: "flex-start" }}>

          {/* LEFT — Editable fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Identity */}
            <div className="glass-strong" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>Identity</span>

              <Field
                label="Username"
                value={username}
                onChange={setUsername}
                placeholder="alice_dev"
              />
              <Field
                label="Bio"
                value={bio}
                onChange={setBio}
                placeholder="Security researcher, ink! contributor…"
                rows={3}
              />
              <Field
                label="GitHub URL"
                value={githubUrl}
                onChange={setGithubUrl}
                placeholder="https://github.com/username"
                type="url"
              />
            </div>

            {/* Intent */}
            <div className="glass-strong" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>I am a…</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {INTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIntent(opt.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "0.75rem 0.875rem",
                      border: intent === opt.id ? "1px solid var(--ink)" : "1px solid var(--line-2)",
                      background: intent === opt.id
                        ? (opt.accent ? "var(--accent)" : "var(--ink)")
                        : "var(--background)",
                      color: intent === opt.id && !opt.accent ? "white" : "var(--ink)",
                      cursor: "pointer", textAlign: "left",
                      boxShadow: intent === opt.id ? "2px 2px 0 var(--ink)" : "none",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      border: `2px solid ${intent === opt.id ? (opt.accent ? "var(--ink)" : "var(--accent)") : "var(--ink-4)"}`,
                      background: intent === opt.id ? (opt.accent ? "var(--ink)" : "var(--accent)") : "transparent",
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: ".82rem", fontWeight: 600 }}>{opt.label}</div>
                      <div style={{
                        fontSize: ".72rem", marginTop: 1,
                        color: intent === opt.id && !opt.accent ? "rgba(255,255,255,0.6)" : "var(--ink-4)",
                      }}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Wallet + stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Wallet */}
            <div className="glass-strong" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>Linked Wallet</span>
              {isConnected && selectedAccount ? (
                <>
                  <div style={{
                    padding: "0.75rem", background: "var(--bg-sunken)", border: "1px solid var(--line)",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".75rem", color: "var(--ink)", wordBreak: "break-all", lineHeight: 1.5 }}>
                      {selectedAccount.address}
                    </div>
                    {selectedAccount.meta.name && (
                      <div style={{ fontSize: ".72rem", color: "var(--ink-4)" }}>
                        {selectedAccount.meta.name}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="dot-pulse" style={{ background: "var(--ok)", color: "var(--ok)" }} />
                    <span style={{ fontSize: ".72rem", color: "var(--ok)", fontWeight: 500 }}>Polkadot wallet connected</span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: ".8rem", color: "var(--ink-4)", lineHeight: 1.5 }}>
                    Connect a Polkadot wallet to link it to your profile and submit or review contracts.
                  </p>
                  <button className="btn btn-ghost btn-sm" onClick={connect} style={{ alignSelf: "flex-start" }}>
                    Connect Wallet
                  </button>
                </div>
              )}
              {profile?.wallet_address && !isConnected && (
                <div style={{ padding: "0.5rem 0.625rem", background: "var(--bg-sunken)", border: "1px solid var(--line)", borderLeft: "3px solid var(--warn)" }}>
                  <div style={{ fontSize: ".7rem", color: "var(--ink-4)", marginBottom: 2 }}>Last linked address</div>
                  <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".7rem", color: "var(--ink-3)" }}>
                    {formatAddress(profile.wallet_address, 10)}
                  </div>
                </div>
              )}
            </div>

            {/* On-chain reputation */}
            <div className="glass-strong" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>On-chain Reputation</span>
                {score?.tier && (
                  <span className={`chip ${TIER_CHIP[score.tier] ?? "chip-slate"}`}>{score.tier}</span>
                )}
              </div>

              {!isConnected ? (
                <p style={{ margin: 0, fontSize: ".78rem", color: "var(--ink-4)" }}>
                  Connect a wallet to see your on-chain reputation.
                </p>
              ) : score ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Score",    value: score.score.toLocaleString() },
                    { label: "Reviews",  value: String(score.reviewsCompleted) },
                    { label: "Slashes",  value: String(score.slashCount) },
                    { label: "Address",  value: formatAddress(score.address, 6) },
                  ].map((row) => (
                    <div key={row.label} style={{ padding: "0.5rem 0.625rem", background: "var(--bg-sunken)", border: "1px solid var(--line)" }}>
                      <div className="label-cap" style={{ marginBottom: 3 }}>{row.label}</div>
                      <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".88rem", fontWeight: 600, color: "var(--ink)" }}>
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: ".78rem", color: "var(--ink-4)" }}>
                  No on-chain reputation yet. Review a contract to start earning.
                </p>
              )}
            </div>

            {/* Quick links */}
            <div className="glass-card" style={{ padding: "1.125rem" }}>
              <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 10 }}>Quick actions</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link href="/submit" style={{ textDecoration: "none" }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}>
                    → Submit a contract for review
                  </button>
                </Link>
                <Link href="/review" style={{ textDecoration: "none" }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}>
                    → Browse open review jobs
                  </button>
                </Link>
                <Link href="/leaderboard" style={{ textDecoration: "none" }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}>
                    → View reputation leaderboard
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center",
          gap: 12, padding: "1rem 1.25rem",
          border: "1px solid var(--line)", background: "var(--bg-elevated)",
          borderTop: "2px solid var(--ink)",
        }}>
          {saveError && (
            <span style={{ fontSize: ".78rem", color: "var(--danger)", flex: 1 }}>{saveError}</span>
          )}
          {saved && !saveError && (
            <span style={{ fontSize: ".78rem", color: "var(--ok)", flex: 1 }}>
              ✓ Profile saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ minWidth: 140 }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
