"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Modal } from "@/components/ui/Modal";
import { AccountSelector } from "./AccountSelector";
import { formatAddress } from "@/lib/format";

export function WalletButton() {
  const { isConnected, isConnecting, selectedAccount, accounts, connect, disconnect, selectAccount, error } =
    useWallet();
  const [modalOpen, setModalOpen] = useState(false);

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

  const initials = selectedAccount?.meta.name?.[0]?.toUpperCase()
    ?? selectedAccount?.address?.slice(2, 4)?.toUpperCase()
    ?? "?";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="btn btn-ghost"
        style={{ paddingLeft: "0.55rem", gap: 8 }}
      >
        <span
          className="dot-pulse"
          style={{ background: "var(--ink)", color: "var(--ink)" }}
        />
        <span className="avatar" style={{ width: 22, height: 22, fontSize: ".55rem" }}>
          {initials}
        </span>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".82rem" }}>
          {formatAddress(selectedAccount?.address ?? "")}
        </span>
      </button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Switch Account">
        <AccountSelector
          accounts={accounts}
          selected={selectedAccount}
          onSelect={async (account) => {
            await selectAccount(account);
            setModalOpen(false);
          }}
        />
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <button
            className="btn btn-danger btn-sm"
            style={{ width: "100%" }}
            onClick={() => { disconnect(); setModalOpen(false); }}
          >
            Disconnect
          </button>
        </div>
      </Modal>
    </>
  );
}
