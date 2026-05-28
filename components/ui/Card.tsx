interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  elevated?: boolean;
}

export function Card({ children, className = "", onClick, elevated = false }: CardProps) {
  const base = elevated ? "glass-strong" : "glass-card";
  const interactive = onClick ? "cursor-pointer" : "";

  return (
    <div onClick={onClick} className={[base, "p-5", interactive, className].join(" ")}>
      {children}
    </div>
  );
}
