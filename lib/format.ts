import type { ReputationTier } from "@/types/reputation.types";

const PLANCK_PER_POT = 1_000_000_000_000n;

export function formatBalance(planck: bigint, decimals = 4): string {
  const whole = planck / PLANCK_PER_POT;
  const fractional = planck % PLANCK_PER_POT;
  const fractionalStr = fractional
    .toString()
    .padStart(12, "0")
    .slice(0, decimals);
  return `${whole.toLocaleString()}.${fractionalStr} POT`;
}

export function formatAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatBlockNumber(block: number): string {
  return `#${block.toLocaleString()}`;
}

export function scoreToTier(score: bigint): ReputationTier {
  if (score >= 10_000n) return "Legend";
  if (score >= 5_000n) return "Expert";
  if (score >= 2_000n) return "Senior";
  if (score >= 1_000n) return "Journeyman";
  if (score >= 250n) return "Apprentice";
  return "Novice";
}

export function tierColor(tier: ReputationTier): string {
  const map: Record<ReputationTier, string> = {
    Novice: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
    Apprentice: "text-green-400 bg-green-400/10 border-green-400/20",
    Journeyman: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Senior: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    Expert: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    Legend: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  };
  return map[tier];
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    Critical: "text-red-400 bg-red-400/10 border-red-400/20",
    High: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Informational: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  };
  return map[severity] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    Open: "text-green-400 bg-green-400/10 border-green-400/20",
    InReview: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Consensus: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    Finalized: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
    Cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  return map[status] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
}

export function planckFromInput(value: string): bigint {
  const [whole = "0", frac = "0"] = value.split(".");
  const fracPadded = frac.slice(0, 12).padEnd(12, "0");
  return BigInt(whole) * PLANCK_PER_POT + BigInt(fracPadded);
}
