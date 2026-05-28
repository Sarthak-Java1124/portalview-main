import { formatAddress } from "@/lib/format";
import type { ReputationScore } from "@/types/reputation.types";
import type { ReputationTier } from "@/types/reputation.types";

interface LeaderboardRowProps {
  entry: ReputationScore;
  rank: number;
  isMe?: boolean;
}

const TIER_CLASS: Record<ReputationTier, string> = {
  Legend:     "tier-legend",
  Expert:     "tier-expert",
  Senior:     "tier-senior",
  Journeyman: "tier-journeyman",
  Apprentice: "tier-apprentice",
  Novice:     "tier-novice",
};

export function LeaderboardRow({ entry, rank, isMe = false }: LeaderboardRowProps) {
  const initials = entry.address.slice(2, 4).toUpperCase();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 1.4fr 1fr 0.9fr 0.7fr 1fr 0.7fr",
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid var(--line)",
        background: isMe ? "var(--paper)" : "transparent",
        boxShadow: isMe ? "inset 3px 0 0 var(--accent), inset -1px 0 0 var(--ink)" : "none",
        alignItems: "center",
        transition: "background 0.15s",
        cursor: "default",
      }}
      onMouseEnter={(e) => { if (!isMe) (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { if (!isMe) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {/* Rank */}
      <span style={{
        fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem", fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: rank <= 3 ? "var(--ink)" : "var(--ink-4)",
      }}>
        #{rank}
      </span>

      {/* Address */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="avatar" style={{ width: 26, height: 26, fontSize: ".62rem" }}>{initials}</span>
        <span style={{
          fontFamily: "var(--font-mono,monospace)", fontSize: ".82rem",
          fontWeight: isMe ? 600 : 500, color: "var(--ink)",
        }}>
          {formatAddress(entry.address, 8)}
        </span>
        {isMe && (
          <span className="chip chip-violet" style={{ fontSize: ".58rem" }}>YOU</span>
        )}
      </div>

      {/* Tier */}
      <span className={`chip ${TIER_CLASS[entry.tier]}`} style={{ width: "fit-content" }}>
        {entry.tier}
      </span>

      {/* Score */}
      <span style={{
        fontFamily: "var(--font-mono,monospace)", textAlign: "right", fontWeight: 600,
        color: "var(--ink-2)", fontVariantNumeric: "tabular-nums",
      }}>
        {entry.score.toLocaleString()}
      </span>

      {/* Reviews */}
      <span style={{
        fontFamily: "var(--font-mono,monospace)", textAlign: "right", color: "var(--ink-4)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {entry.reviewsCompleted}
      </span>

      {/* Slashes */}
      <span style={{
        fontFamily: "var(--font-mono,monospace)", textAlign: "right",
        color: entry.slashCount > 0 ? "var(--danger)" : "var(--ink-5)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {entry.slashCount}
      </span>
    </div>
  );
}
