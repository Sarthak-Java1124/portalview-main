"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { formatAddress } from "@/lib/format";

export function WalletButton() {
  const {
    isConnected, isConnecting, selectedAccount, accounts,
    connect, disconnect, selectAccount, error,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <button className="btn btn-ghost" onClick={connect} disabled={isConnecting}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22v-4"/><path d="M8 18h8v-4H8z"/><path d="M9 10V4"/><path d="M15 10V4"/>
          </svg>
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
        {error && (
          <span style={{ fontSize: ".72rem", color: "var(--danger)", maxWidth: 200, textAlign: "right" }}>{error}</span>
        )}
      </div>
    );
  }

  const name = selectedAccount?.meta.name ?? "Unnamed";
  const initials = name[0]?.toUpperCase()
    ?? selectedAccount?.address?.slice(2, 4)?.toUpperCase()
    ?? "?";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost"
        style={{ paddingLeft: "0.55rem", gap: 8 }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="dot-pulse" style={{ background: "var(--ok)", color: "var(--ok)" }} />
        <span className="avatar" style={{ width: 22, height: 22, fontSize: ".55rem" }}>
          {initials}
        </span>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".82rem" }}>
          {formatAddress(selectedAccount?.address ?? "")}
        </span>
        <svg
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            opacity: 0.45,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 50,
            width: 256,
            border: "1px solid var(--ink)",
            background: "var(--background)",
            boxShadow: "4px 4px 0 var(--ink)",
          }}
        >
          {/* Selected account header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "0.75rem 0.875rem",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg-elevated)",
          }}>
            <span className="avatar" style={{ width: 32, height: 32, fontSize: ".68rem", flexShrink: 0, background: "var(--accent)", color: "var(--ink)" }}>
              {initials}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {name}
              </div>
              <div style={{ fontSize: ".68rem", fontFamily: "var(--font-mono,monospace)", color: "var(--ink-4)", marginTop: 1 }}>
                {formatAddress(selectedAccount?.address ?? "", 8)}
              </div>
            </div>
            <span style={{ marginLeft: "auto", flexShrink: 0 }}>
              <span className="dot-pulse" style={{ background: "var(--ok)", color: "var(--ok)" }} />
            </span>
          </div>

          {/* Account switcher — only shown when multiple accounts exist */}
          {accounts.length > 1 && (
            <>
              <div style={{
                padding: "0.45rem 0.875rem 0.25rem",
                fontSize: ".62rem", fontWeight: 700,
                letterSpacing: ".1em", textTransform: "uppercase",
                color: "var(--ink-4)",
              }}>
                Switch account
              </div>
              <div style={{ display: "flex", flexDirection: "column", padding: "0 0.5rem 0.375rem" }}>
                {accounts.map((account) => {
                  const isSel = account.address === selectedAccount?.address;
                  const aName = account.meta.name ?? "Unnamed";
                  const aInit = aName[0]?.toUpperCase() ?? "?";
                  return (
                    <button
                      key={account.address}
                      role="menuitem"
                      onClick={async () => { await selectAccount(account); setOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "0.45rem 0.375rem",
                        background: isSel ? "var(--accent)" : "transparent",
                        border: "none",
                        cursor: isSel ? "default" : "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <span className="avatar" style={{
                        width: 26, height: 26, fontSize: ".58rem", flexShrink: 0,
                        background: isSel ? "var(--ink)" : "var(--bg-sunken)",
                        color: isSel ? "white" : "var(--ink-3)",
                        border: "1px solid var(--line)",
                      }}>
                        {aInit}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {aName}
                        </div>
                        <div style={{ fontSize: ".66rem", fontFamily: "var(--font-mono,monospace)", color: "var(--ink-4)" }}>
                          {formatAddress(account.address)}
                        </div>
                      </div>
                      {isSel && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", flexShrink: 0, color: "var(--ink)" }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ height: 1, background: "var(--line)" }} />
            </>
          )}

          {/* Disconnect */}
          <div style={{ padding: "0.625rem 0.875rem" }}>
            <button
              role="menuitem"
              className="btn btn-danger btn-sm"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => { disconnect(); setOpen(false); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Disconnect wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
