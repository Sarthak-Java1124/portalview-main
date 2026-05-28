import { formatAddress } from "@/lib/format";
import type { ReputationTier } from "@/types/reputation.types";

interface ReputationBadgeProps {
  score: bigint;
  address: string;
  tier: ReputationTier;
  showAddress?: boolean;
}

const TIER_CLASS: Record<ReputationTier, string> = {
  Legend:     "tier-legend",
  Expert:     "tier-expert",
  Senior:     "tier-senior",
  Journeyman: "tier-journeyman",
  Apprentice: "tier-apprentice",
  Novice:     "tier-novice",
};

export function ReputationBadge({ score, address, tier, showAddress = false }: ReputationBadgeProps) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        className={`chip ${TIER_CLASS[tier]}`}
        title={`Score: ${score.toLocaleString()} · ${formatAddress(address)}`}
      >
        {tier}
      </span>
      {showAddress && (
        <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: ".75rem", color: "var(--ink-4)" }}>
          {formatAddress(address)}
        </span>
      )}
    </div>
  );
}
