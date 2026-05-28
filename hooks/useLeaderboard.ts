"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MOCK_LEADERBOARD, delay } from "@/lib/mock-data";
import type { ReputationScore } from "@/types/reputation.types";

interface UseLeaderboardResult {
  entries: ReputationScore[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLeaderboard(): UseLeaderboardResult {
  const [entries, setEntries] = useState<ReputationScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await delay(400);
    if (!isMounted.current) return;
    setEntries([...MOCK_LEADERBOARD]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, isLoading, error, refresh };
}
