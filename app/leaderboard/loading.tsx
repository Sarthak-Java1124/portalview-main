import { AppShell } from "@/components/layout/AppShell";

export default function LeaderboardLoading() {
  return (
    <AppShell>
      <div className="max-w-3xl flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-40 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-60 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
