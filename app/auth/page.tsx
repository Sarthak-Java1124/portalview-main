"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import type { UserIntent } from "@/types/auth.types";

type Mode = "signin" | "signup";

const INTENT_OPTIONS: { id: UserIntent; label: string; desc: string }[] = [
  { id: "submitter", label: "Submitter",  desc: "I submit contracts for review" },
  { id: "reviewer",  label: "Reviewer",   desc: "I audit contracts and earn POT" },
  { id: "both",      label: "Both",       desc: "I submit and review" },
];

function AuthForm() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [intent, setIntent]     = useState<UserIntent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        router.push(next);
      } else {
        if (!username.trim()) throw new Error("Username is required");
        if (username.trim().length < 3) throw new Error("Username must be at least 3 characters");
        if (!intent) throw new Error("Please select your intent");
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        await signUp(email, password, username, intent);
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--background)" }}>
        <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem", color: "var(--ink-4)" }}>
          Loading…
        </div>
      </div>
    );
  }


  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
            <div style={{
              width: 32, height: 32, display: "grid", placeItems: "center",
              background: "var(--accent)", border: "1px solid var(--ink)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 4 6v6c0 4.5 3.4 8.5 8 9 4.6-.5 8-4.5 8-9V6l-8-3Z"/>
                <path d="M12 7v10"/><path d="M8 12h8"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.01em" }}>PortalReview</span>
          </Link>
          <p style={{ margin: "10px 0 0", fontSize: ".82rem", color: "var(--ink-4)" }}>
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--line-2)" }}>
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              style={{
                padding: "0.6rem",
                background: mode === m ? "var(--ink)" : "var(--background)",
                color: mode === m ? "white" : "var(--ink-3)",
                border: "none", cursor: "pointer",
                fontSize: ".82rem", fontWeight: mode === m ? 600 : 500,
                transition: "background 0.15s",
              }}
            >
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid var(--ink)", background: "var(--background)",
            boxShadow: "4px 4px 0 var(--ink)",
            display: "flex", flexDirection: "column", gap: 16,
            padding: "1.5rem",
          }}
        >
          {/* Username (sign up only) */}
          {mode === "signup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label-cap">Username</label>
              <input
                className="glass-input"
                type="text"
                placeholder="alice_dev"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                style={{ fontFamily: "var(--font-mono,monospace)" }}
              />
            </div>
          )}

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="label-cap">Email</label>
            <input
              className="glass-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="label-cap">Password</label>
            <input
              className="glass-input"
              type="password"
              placeholder={mode === "signup" ? "Min 8 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {/* Intent (sign up only) */}
          {mode === "signup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="label-cap">I am a…</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {INTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIntent(opt.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "0.625rem 0.75rem",
                      border: intent === opt.id ? "1px solid var(--ink)" : "1px solid var(--line-2)",
                      background: intent === opt.id ? "var(--accent)" : "var(--background)",
                      cursor: "pointer", textAlign: "left",
                      boxShadow: intent === opt.id ? "2px 2px 0 var(--ink)" : "none",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `2px solid ${intent === opt.id ? "var(--ink)" : "var(--ink-4)"}`,
                      background: intent === opt.id ? "var(--ink)" : "transparent",
                      flexShrink: 0, display: "grid", placeItems: "center",
                    }}>
                      {intent === opt.id && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" }}>{opt.label}</div>
                      <div style={{ fontSize: ".72rem", color: "var(--ink-3)", marginTop: 1 }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "0.625rem 0.75rem",
              background: "rgba(185,28,28,0.06)",
              border: "1px solid var(--danger)",
              fontSize: ".8rem", color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.7rem", fontSize: ".88rem", marginTop: 4 }}
          >
            {submitting
              ? (mode === "signin" ? "Signing in…" : "Creating account…")
              : (mode === "signin" ? "Sign In" : "Create Account")}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: ".78rem", color: "var(--ink-4)", margin: 0 }}>
          {mode === "signin" ? (
            <>No account? <button className="btn btn-ghost btn-sm" style={{ padding: "0.1rem 0.4rem" }} onClick={() => { setMode("signup"); setError(null); }}>Create one</button></>
          ) : (
            <>Already have an account? <button className="btn btn-ghost btn-sm" style={{ padding: "0.1rem 0.4rem" }} onClick={() => { setMode("signin"); setError(null); }}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--background)" }}>
        <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem", color: "var(--ink-4)" }}>Loading…</div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
