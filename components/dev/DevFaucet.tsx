"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useToastContext } from "@/context/ToastContext";

// Only rendered when NODE_ENV === "development" — gated at the call site too.
export function DevFaucet() {
  const { selectedAccount } = useWallet();
  const { toast } = useToastContext();
  const [loading, setLoading] = useState(false);

  if (!selectedAccount) return null;

  const handleDrop = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: selectedAccount.address }),
      });
      const data = await res.json() as { success?: boolean; amount?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Faucet failed");
      toast(`Faucet dropped ${data.amount ?? "10,000 POT"} to your wallet`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Faucet request failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.625rem 0.875rem",
      background: "rgba(240,224,0,0.08)",
      border: "1px solid var(--accent-border)",
      borderLeft: "3px solid var(--accent)",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--warn)", flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontSize: ".78rem", color: "var(--ink-2)" }}>
          <span style={{ fontWeight: 600 }}>Dev mode · </span>
          Low balance? Drop 10,000 test POT from Alice to your wallet.
        </span>
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={handleDrop}
        disabled={loading}
        style={{ flexShrink: 0, marginLeft: 12 }}
      >
        {loading ? "Sending…" : "Drop POT"}
      </button>
    </div>
  );
}
