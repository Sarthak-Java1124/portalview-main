import { AppShell } from "@/components/layout/AppShell";

export default function SubmitLoading() {
  return (
    <AppShell>
      <div className="max-w-2xl flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-72 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div className="glass-card p-6 h-80 animate-pulse" />
      </div>
    </AppShell>
  );
}
