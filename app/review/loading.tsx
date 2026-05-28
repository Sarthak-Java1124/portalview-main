import { AppShell } from "@/components/layout/AppShell";

export default function ReviewLoading() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-6xl">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-52 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-80 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass-card p-6 h-40 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
