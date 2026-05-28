"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function ReviewError({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    console.error("[ReviewError]", error);
  }, [error]);

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <span className="text-4xl">⊞</span>
        <h2 className="text-lg font-semibold text-white">
          Failed to load review workspace
        </h2>
        <p className="text-sm text-white/50 max-w-sm">{error.message}</p>
        <Button variant="primary" size="sm" onClick={unstable_retry}>
          Try again
        </Button>
      </div>
    </AppShell>
  );
}
