"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "./useApi";
import { useWallet } from "./useWallet";
import { MOCK_LEADERBOARD, delay } from "@/lib/mock-data";
import { loadAbiJson, createContract } from "@/services/contract.service";
import { queryLeaderboard } from "@/services/reputation.service";
import { USE_LIVE_TXS, CONFIG, LEADERBOARD_SIZE, ZERO_CALLER } from "@/lib/constants";
import type { ReputationScore } from "@/types/reputation.types";

interface UseLeaderboardResult {
  entries: ReputationScore[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLeaderboard(): UseLeaderboardResult {
  const { api } = useApi();
  const { selectedAccount } = useWallet();
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

    if (USE_LIVE_TXS && api) {
      try {
        const caller = selectedAccount?.address ?? ZERO_CALLER;
        const abi = await loadAbiJson("reputation");
        const contract = createContract(api, abi, CONFIG.reputationAddress);
        const data = await queryLeaderboard(api, contract, caller, 0, LEADERBOARD_SIZE);
        if (!isMounted.current) return;
        setEntries(data);
      } catch (err) {
        if (!isMounted.current) return;
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
      return;
    }

    await delay(400);
    if (!isMounted.current) return;
    setEntries([...MOCK_LEADERBOARD]);
    setIsLoading(false);
  }, [api, selectedAccount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, isLoading, error, refresh };
}
