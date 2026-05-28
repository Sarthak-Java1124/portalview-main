type SpinnerSize = "sm" | "md" | "lg";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ animation: "spin 1s linear infinite", borderColor: "var(--line-2)", borderTopColor: "var(--ink)" }}
      className={["inline-block rounded-full", sizeClasses[size], className].join(" ")}
    />
  );
}
