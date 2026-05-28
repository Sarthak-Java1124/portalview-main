"use client";

import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet/WalletButton";
import { APP_NAME } from "@/lib/constants";

const PAGE_META: Record<string, { title: string; subtitle?: string; breadcrumb?: string[] }> = {
  "/dashboard":   { title: "Dashboard",        subtitle: "Review queue & your activity",       breadcrumb: [APP_NAME, "Dashboard"] },
  "/submit":      { title: "Submit Contract",  subtitle: "Open a new security review",         breadcrumb: [APP_NAME, "Submit"] },
  "/review":      { title: "Review Work",      subtitle: "Browse jobs, stake, earn POT",       breadcrumb: [APP_NAME, "Review"] },
  "/leaderboard": { title: "Leaderboard",      subtitle: "Top reviewers by reputation",        breadcrumb: [APP_NAME, "Leaderboard"] },
};

export function Topbar() {
  const pathname = usePathname();

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
        {/* Search icon */}
        <button className="btn btn-ghost btn-icon" aria-label="Search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>
          </svg>
        </button>

        {/* Bell icon with unread dot */}
        <button className="btn btn-ghost btn-icon" aria-label="Notifications" style={{ position: "relative" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/>
            <path d="M10 21a2 2 0 0 0 4 0"/>
          </svg>
          <span style={{
            position: "absolute", top: 5, right: 5, width: 6, height: 6,
            background: "var(--accent)", border: "1px solid var(--ink)",
          }} />
        </button>

        <WalletButton />
      </div>
    </header>
  );
}
