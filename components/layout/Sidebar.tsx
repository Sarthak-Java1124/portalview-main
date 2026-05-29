"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { formatAddress } from "@/lib/format";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const GENERAL_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/>
        <rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>
      </svg>
    ),
  },
];

const SUBMITTER_NAV: NavItem[] = [
  {
    label: "Submit Contract",
    href: "/submit",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>
      </svg>
    ),
  },
];

const ACCOUNT_NAV: NavItem[] = [
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const REVIEWER_NAV: NavItem[] = [
  {
    label: "Review Work",
    href: "/review",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/><line x1="14" y1="4" x2="10" y2="20"/>
      </svg>
    ),
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10v4a5 5 0 1 1-10 0V4Z"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/>
        <path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M10 17h4"/><path d="M12 13v4"/><path d="M9 21h6"/>
      </svg>
    ),
  },
];

function NavSection({ label, items, pathname }: { label?: string; items: NavItem[]; pathname: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {label && (
        <span style={{
          fontSize: ".58rem", letterSpacing: ".1em", textTransform: "uppercase",
          fontWeight: 700, color: "var(--ink-5)", fontFamily: "var(--font-mono,monospace)",
          padding: "0.5rem 0.625rem 0.25rem",
        }}>
          {label}
        </span>
      )}
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "0.5rem 0.625rem",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--ink)" : "var(--ink-3)",
              fontSize: ".82rem",
              fontWeight: active ? 600 : 500,
              borderLeft: active ? "3px solid var(--ink)" : "3px solid transparent",
              textDecoration: "none",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected, selectedAccount, connect } = useWallet();
  const { api, status } = useApi();
  const { user, profile } = useAuth();

  const [blockNum, setBlockNum] = useState<string>("—");
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!api || status !== "ready") return;

    (async () => {
      unsubRef.current = (await api.rpc.chain.subscribeNewHeads((header: { number: { toNumber(): number } }) => {
        setBlockNum(header.number.toNumber().toLocaleString());
      })) as unknown as () => void;
    })();

    return () => { unsubRef.current?.(); };
  }, [api, status]);

  const initials = profile?.username?.slice(0, 2).toUpperCase()
    ?? selectedAccount?.meta.name?.[0]?.toUpperCase()
    ?? selectedAccount?.address?.slice(2, 4)?.toUpperCase()
    ?? "?";

  return (
    <aside
      style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 220, zIndex: 30,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid var(--line)",
        background: "var(--bg-elevated)",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.125rem 0.875rem", gap: 4 }}>

        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "0.25rem 0.5rem 0.75rem",
            color: "var(--ink)", textDecoration: "none",
          }}
        >
          <div style={{
            width: 28, height: 28, display: "grid", placeItems: "center",
            background: "var(--accent)", border: "1px solid var(--ink)", color: "var(--ink)",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4 6v6c0 4.5 3.4 8.5 8 9 4.6-.5 8-4.5 8-9V6l-8-3Z"/>
              <path d="M12 7v10"/><path d="M8 12h8"/>
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: ".92rem", fontWeight: 700, letterSpacing: "-.01em" }}>PortalReview</span>
            <span style={{ fontSize: ".6rem", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)" }}>
              v0.4 · testnet
            </span>
          </div>
        </Link>

        <div style={{ height: 1, background: "var(--line)", margin: "0 0 0.5rem" }} />

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavSection items={GENERAL_NAV} pathname={pathname} />

          <div style={{ height: 1, background: "var(--line)", margin: "0.25rem 0" }} />

          <NavSection label="Submitter" items={SUBMITTER_NAV} pathname={pathname} />

          <div style={{ height: 1, background: "var(--line)", margin: "0.25rem 0" }} />

          <NavSection label="Reviewer" items={REVIEWER_NAV} pathname={pathname} />

          <div style={{ height: 1, background: "var(--line)", margin: "0.25rem 0" }} />

          <NavSection label="Account" items={ACCOUNT_NAV} pathname={pathname} />
        </nav>

        <div style={{ flex: 1 }} />

        {/* Network status */}
        <div style={{
          padding: "0.625rem",
          background: "var(--background)",
          border: "1px solid var(--line)",
          display: "flex", flexDirection: "column", gap: 6,
          marginBottom: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              className="dot-pulse"
              style={{
                background: status === "ready" ? "var(--ok)" : status === "connecting" ? "var(--warn)" : "var(--ink-4)",
                color: status === "ready" ? "var(--ok)" : "var(--warn)",
              }}
            />
            <span style={{ fontSize: ".6rem", letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 600, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)" }}>
              Portaldot · {status === "ready" ? "Live" : status}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".66rem" }}>
            <span style={{ color: "var(--ink-4)" }}>Block</span>
            <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
              {status === "ready" ? `#${blockNum}` : "—"}
            </span>
          </div>
        </div>

        {/* Account pill */}
        {user ? (
          <Link href="/profile" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "0.5rem 0.625rem",
              background: "var(--accent)", border: "1px solid var(--ink)",
              cursor: "pointer",
            }}>
              <span className="avatar" style={{ width: 26, height: 26, fontSize: ".58rem" }}>
                {initials}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".74rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink)" }}>
                  {profile?.username ?? user.email?.split("@")[0]}
                </span>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".62rem", color: "var(--ink-2)", textTransform: "capitalize" }}>
                  {profile?.intent ?? "view profile"}
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/auth" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0.5rem 0.625rem",
              background: "var(--background)", border: "1px solid var(--line-2)",
              cursor: "pointer",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-4)", flexShrink: 0 }}>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--ink)" }}>Sign in</span>
                <span style={{ fontSize: ".62rem", color: "var(--ink-4)" }}>or create an account</span>
              </div>
            </div>
          </Link>
        )}

        {/* Wallet pill (below account) */}
        <button
          onClick={connect}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "0.45rem 0.625rem",
            background: isConnected ? "var(--background)" : "transparent",
            border: isConnected ? "1px solid var(--line)" : "1px dashed var(--line-2)",
            cursor: "pointer", textAlign: "left", color: "var(--ink)",
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: isConnected ? "var(--ok)" : "var(--ink-5)",
          }} />
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".68rem", color: isConnected ? "var(--ink-3)" : "var(--ink-5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isConnected
              ? formatAddress(selectedAccount?.address ?? "", 6)
              : "No wallet connected"}
          </span>
        </button>
      </div>
    </aside>
  );
}
