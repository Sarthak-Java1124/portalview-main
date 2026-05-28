"use client";

import { useState } from "react";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import { formatBalance, planckFromInput } from "@/lib/format";

const PRESETS = [100, 500, 1000, 2500];

interface StakeInputProps {
  value: string;
  onChange: (raw: string, planck: bigint) => void;
  min?: string;
  label?: string;
  disabled?: boolean;
}

export function StakeInput({ value, onChange, min = "0", label = "Stake Amount", disabled = false }: StakeInputProps) {
  const { selectedAccount } = useWallet();
  const { free, isLoading } = useBalance(selectedAccount?.address ?? null);
  const [inputError, setInputError] = useState<string | null>(null);

  const handleChange = (raw: string) => {
    setInputError(null);
    if (raw === "" || raw === ".") { onChange(raw, 0n); return; }
    if (!/^\d*\.?\d{0,12}$/.test(raw)) return;

    const planck = planckFromInput(raw);
    const minPlanck = planckFromInput(min);

    if (planck < minPlanck) setInputError(`Minimum is ${min} POT`);
    else if (planck > free) setInputError("Insufficient balance");

    onChange(raw, planck);
  };

  const handleMax = () => {
    if (free === 0n) return;
    handleChange((free / 1_000_000_000_000n).toString());
  };

  const setPreset = (pot: number) => {
    handleChange(pot.toString());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label className="label-cap">{label}</label>
        <span style={{ fontSize: ".75rem", color: "var(--ink-4)" }}>
          Balance:{" "}
          <span style={{ fontFamily: "var(--font-mono,monospace)", color: "var(--ink-2)" }}>
            {isLoading ? "…" : formatBalance(free)}
          </span>
        </span>
      </div>

      <div style={{ position: "relative" }}>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="glass-input"
          style={{ fontFamily: "var(--font-mono,monospace)", fontSize: "1.5rem", fontWeight: 600, paddingRight: "6rem", fontVariantNumeric: "tabular-nums" }}
        />
        <span style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--ink-4)", letterSpacing: ".04em" }}>POT</span>
          <button
            type="button"
            onClick={handleMax}
            disabled={disabled || free === 0n}
            className="btn btn-ghost btn-sm"
            style={{ padding: "0.2rem 0.45rem", fontSize: ".68rem" }}
          >
            MAX
          </button>
        </span>
      </div>

      {/* Preset chips */}
      <div style={{ display: "flex", gap: 6 }}>
        {PRESETS.map((p) => {
          const display = p >= 1000 ? `${p / 1000}K` : p;
          const isActive = value === p.toString();
          return (
            <button
              key={p}
              type="button"
              className={`filter-chip ${isActive ? "is-active" : ""}`}
              style={{ flex: 1 }}
              onClick={() => setPreset(p)}
              disabled={disabled}
            >
              {display} POT
            </button>
          );
        })}
      </div>

      {inputError && (
        <p style={{ fontSize: ".78rem", color: "var(--danger)" }}>{inputError}</p>
      )}
    </div>
  );
}
