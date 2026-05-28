"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReputationScore, delay, mockTxHash } from "@/lib/mock-data";
import { useWallet } from "./useWallet";
import { scoreToTier } from "@/lib/format";
import type { ReputationScore } from "@/types/reputation.types";
import type { TxStatus } from "@/types/staking.types";

interface UseReputationResult {
  score: ReputationScore | null;
  isLoading: boolean;
  error: string | null;
  refetch: (address?: string) => Promise<void>;
  slash: (address: string, jobId: string, amount: bigint) => Promise<string>;
  reward: (address: string, jobId: string, amount: bigint) => Promise<string>;
  txStatus: TxStatus;
  txError: string | null;
  resetTx: () => void;
}

export function useReputation(watchAddress?: string): UseReputationResult {
  const { selectedAccount } = useWallet();
  const [score, setScore] = useState<ReputationScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refetch = useCallback(async (address?: string) => {
    const target = address ?? watchAddress ?? selectedAccount?.address;
    if (!target) return;

    setIsLoading(true);
    setError(null);
    await delay(300);
    if (!isMounted.current) return;
    setScore(getReputationScore(target));
    setIsLoading(false);
  }, [watchAddress, selectedAccount]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const simulateTx = useCallback(async (): Promise<string> => {
    setTxStatus("pending");
    setTxError(null);
    await delay(200);
    setTxStatus("broadcast");
    await delay(600);
    setTxStatus("inBlock");
    await delay(800);
    const hash = mockTxHash();
    setTxStatus("finalized");
    return hash;
  }, []);

  const slash = useCallback(
    async (address: string, _jobId: string, amount: bigint): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");
      const hash = await simulateTx();
      if (isMounted.current) {
        setScore((prev) => {
          if (!prev || prev.address !== address) return prev;
          const newScore = prev.score > amount ? prev.score - amount : 0n;
          return {
            ...prev,
            score: newScore,
            tier: scoreToTier(newScore),
            slashCount: prev.slashCount + 1,
          };
        });
      }
      return hash;
    },
    [selectedAccount, simulateTx]
  );

  const reward = useCallback(
    async (address: string, _jobId: string, amount: bigint): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");
      const hash = await simulateTx();
      if (isMounted.current) {
        setScore((prev) => {
          if (!prev || prev.address !== address) return prev;
          const newScore = prev.score + amount;
          return {
            ...prev,
            score: newScore,
            tier: scoreToTier(newScore),
            reviewsCompleted: prev.reviewsCompleted + 1,
          };
        });
      }
      return hash;
    },
    [selectedAccount, simulateTx]
  );

  const resetTx = useCallback(() => {
    setTxStatus("idle");
    setTxError(null);
  }, []);

  return { score, isLoading, error, refetch, slash, reward, txStatus, txError, resetTx };
}
