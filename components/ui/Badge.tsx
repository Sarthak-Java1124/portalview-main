export type BadgeVariant =
  | "violet" | "amber" | "rose" | "emerald" | "sky" | "slate" | "ok"
  | "legend" | "expert" | "senior" | "journeyman" | "apprentice" | "novice";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const TIER_CLASS: Record<string, string> = {
  legend:     "tier-legend",
  expert:     "tier-expert",
  senior:     "tier-senior",
  journeyman: "tier-journeyman",
  apprentice: "tier-apprentice",
  novice:     "tier-novice",
};

const CHIP_CLASS: Record<string, string> = {
  violet:  "chip-violet",
  amber:   "chip-amber",
  rose:    "chip-rose",
  emerald: "chip-emerald",
  sky:     "chip-sky",
  slate:   "chip-slate",
  ok:      "chip-ok",
};

export function Badge({ label, variant = "slate", className = "", dot = false }: BadgeProps) {
  const isTier = variant in TIER_CLASS;
  const baseClass = isTier
    ? ["chip", TIER_CLASS[variant], className].join(" ")
    : ["chip", CHIP_CLASS[variant] ?? "chip-slate", className].join(" ");

  return (
    <span className={baseClass}>
      {dot && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />}
      {label}
    </span>
  );
}
