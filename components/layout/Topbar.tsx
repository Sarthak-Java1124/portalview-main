"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useAuth } from "@/context/AuthContext";
import { APP_NAME } from "@/lib/constants";

const PAGE_META: Record<string, { title: string; subtitle?: string; breadcrumb?: string[] }> = {
  "/dashboard":   { title: "Dashboard",        subtitle: "Review queue & your activity",       breadcrumb: [APP_NAME, "Dashboard"] },
  "/submit":      { title: "Submit Contract",  subtitle: "Open a new security review",         breadcrumb: [APP_NAME, "Submit"] },
  "/review":      { title: "Review Work",      subtitle: "Browse jobs, stake, earn POT",       breadcrumb: [APP_NAME, "Review"] },
  "/leaderboard": { title: "Leaderboard",      subtitle: "Top reviewers by reputation",        breadcrumb: [APP_NAME, "Leaderboard"] },
};

export function Topbar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? "?";

  const baseRoute = "/" + (pathname.split("/")[1] ?? "");
  const meta = PAGE_META[baseRoute] ?? { title: APP_NAME };
  const isDetail = pathname.split("/").length > 2 && baseRoute === "/review";

  const breadcrumb = isDetail
    ? [APP_NAME, "Review", "Job Detail"]
    : meta.breadcrumb;

  return (
    <header
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem",
        borderBottom: "1px solid var(--line)",
        background: "var(--background)",
        position: "sticky", top: 0, zIndex: 20,
      }}
    >
      {/* Left: breadcrumb + title */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {breadcrumb && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".72rem", color: "var(--ink-4)" }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {i > 0 && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 6 15 12 9 18"/>
                  </svg>
                )}
                <span style={{ color: i === breadcrumb.length - 1 ? "var(--ink-2)" : "var(--ink-4)" }}>{b}</span>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-.015em", color: "var(--ink)" }}>
            {meta.title}
          </h1>
          {meta.subtitle && (
            <span style={{ fontSize: ".82rem", color: "var(--ink-4)" }}>{meta.subtitle}</span>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <WalletButton />

        {user ? (
          <Link href="/profile" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0.35rem 0.625rem",
              border: "1px solid var(--ink)",
              background: "var(--accent)",
              cursor: "pointer",
            }}>
              <span style={{
                width: 22, height: 22, display: "grid", placeItems: "center",
                background: "var(--ink)", color: "white",
                fontFamily: "var(--font-mono,monospace)", fontSize: ".58rem", fontWeight: 700,
                flexShrink: 0,
              }}>
                {initials}
              </span>
              <span style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
                {profile?.username ?? user.email?.split("@")[0]}
              </span>
              {profile?.intent && (
                <span style={{
                  fontSize: ".6rem", fontWeight: 600, letterSpacing: ".05em",
                  textTransform: "uppercase", color: "var(--ink-3)",
                }}>
                  · {profile.intent}
                </span>
              )}
            </div>
          </Link>
        ) : (
          <Link href="/auth" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign In
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
