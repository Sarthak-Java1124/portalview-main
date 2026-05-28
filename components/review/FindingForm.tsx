"use client";

import { useState } from "react";
import { TxStatusBanner } from "@/components/staking/TxStatusBanner";
import type { FindingSeverity } from "@/types/review.types";
import type { TxStatus } from "@/types/staking.types";

const SEVERITY_OPTIONS: { id: FindingSeverity; label: string; cls: string }[] = [
  { id: "Critical",      label: "Critical",      cls: "sev-critical" },
  { id: "High",          label: "High",          cls: "sev-high" },
  { id: "Medium",        label: "Medium",        cls: "sev-medium" },
  { id: "Informational", label: "Info",          cls: "sev-info" },
];

interface FindingFormProps {
  jobId: string;
  txStatus: TxStatus;
  txHash: string | null;
  txError: string | null;
  onSubmit: (jobId: string, severity: FindingSeverity, title: string, description: string) => Promise<string>;
  onReset: () => void;
}

export function FindingForm({ jobId, txStatus, txHash, txError, onSubmit, onReset }: FindingFormProps) {
  const [severity, setSeverity] = useState<FindingSeverity>("Medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSubmitting = txStatus === "pending" || txStatus === "broadcast" || txStatus === "inBlock";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) { setValidationError("Title is required"); return; }
    if (title.trim().length < 5) { setValidationError("Title must be at least 5 characters"); return; }
    if (!description.trim()) { setValidationError("Description is required"); return; }
    if (description.trim().length < 20) { setValidationError("Description must be at least 20 characters"); return; }

    await onSubmit(jobId, severity, title.trim(), description.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Severity */}
      <div>
        <label className="label-cap" style={{ display: "block", marginBottom: 8 }}>Severity</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sev-chip ${s.cls} ${severity === s.id ? "is-selected" : ""}`}
              onClick={() => setSeverity(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="label-cap" style={{ display: "block", marginBottom: 6 }}>Title</label>
        <input
          type="text"
          className="glass-input"
          placeholder="Reentrancy in withdraw()"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          maxLength={120}
        />
      </div>

      {/* Description */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <label className="label-cap">Description</label>
          <span style={{ fontSize: ".68rem", color: "var(--ink-4)" }}>{description.length} / 2000</span>
        </div>
        <textarea
          className="glass-input"
          style={{ minHeight: 140, fontFamily: "var(--font-mono, monospace)", fontSize: ".78rem", lineHeight: 1.55, resize: "vertical" }}
          placeholder="Describe the vulnerability, impact, and recommended fix…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          maxLength={2000}
        />
      </div>

      {validationError && (
        <p style={{ fontSize: ".78rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          {validationError}
        </p>
      )}

      <TxStatusBanner status={txStatus} txHash={txHash} error={txError} onReset={onReset} />

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        style={{ width: "100%" }}
        disabled={isSubmitting || txStatus === "finalized"}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>
        </svg>
        {isSubmitting ? "Submitting…" : "Submit Finding"}
      </button>
    </form>
  );
}
