"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "./useApi";
import { useWallet } from "./useWallet";
import { getReputationScore, delay, mockTxHash } from "@/lib/mock-data";
import { loadAbiJson, createContract } from "@/services/contract.service";
import { queryScore, buildSlashTx, buildRewardTx } from "@/services/reputation.service";
import { USE_LIVE_TXS, CONFIG } from "@/lib/constants";
import { scoreToTier } from "@/lib/format";
import type { ReputationScore } from "@/types/reputation.types";
import type { TxStatus } from "@/types/staking.types";
import type { Signer, SubmittableExtrinsic } from "@polkadot/api/types";

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
  const { api } = useApi();
  const { selectedAccount, signer } = useWallet();
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

    if (USE_LIVE_TXS && api && selectedAccount) {
      try {
        const abi = await loadAbiJson("reputation");
        const contract = createContract(api, abi, CONFIG.reputationAddress);
        const data = await queryScore(api, contract, selectedAccount.address, target);
        if (!isMounted.current) return;
        setScore(data);
      } catch (err) {
        if (!isMounted.current) return;
        setError(err instanceof Error ? err.message : "Failed to fetch reputation");
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
      return;
    }

    await delay(300);
    if (!isMounted.current) return;
    setScore(getReputationScore(target));
    setIsLoading(false);
  }, [api, selectedAccount, watchAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const _execLiveTx = useCallback(
    async (buildTxFn: () => SubmittableExtrinsic<"promise">): Promise<string> => {
      if (!api || !signer || !selectedAccount) throw new Error("Not connected");
      const _signer = signer as Signer;
      const _address = selectedAccount.address;

      setTxStatus("pending");
      setTxError(null);

      const tx = buildTxFn();
      return new Promise((resolve, reject) => {
        tx.signAndSend(_address, { signer: _signer }, (result) => {
          const { status: s, dispatchError, isError } = result;
          if (s.isBroadcast) setTxStatus("broadcast");
          else if (s.isInBlock) setTxStatus("inBlock");
          else if (s.isFinalized) {
            setTxStatus("finalized");
            resolve(result.txHash.toHex());
          }
          if (isError || dispatchError) {
            const msg = dispatchError?.toString() ?? "Transaction failed";
            setTxStatus("error");
            setTxError(msg);
            reject(new Error(msg));
          }
        }).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Transaction error";
          setTxStatus("error");
          setTxError(msg);
          reject(err instanceof Error ? err : new Error(msg));
        });
      });
    },
    [api, signer, selectedAccount]
  );

  const _simulateTx = useCallback(async (): Promise<string> => {
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
    async (address: string, jobId: string, amount: bigint): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");

      if (USE_LIVE_TXS && api && signer) {
        const abi = await loadAbiJson("reputation");
        const contract = createContract(api, abi, CONFIG.reputationAddress);
        const hash = await _execLiveTx(() => buildSlashTx(api, contract, address, jobId, amount));
        if (isMounted.current) await refetch(address);
        return hash;
      }

      const hash = await _simulateTx();
      if (isMounted.current) {
        setScore((prev) => {
          if (!prev || prev.address !== address) return prev;
          const newScore = prev.score > amount ? prev.score - amount : 0n;
          return { ...prev, score: newScore, tier: scoreToTier(newScore), slashCount: prev.slashCount + 1 };
        });
      }
      return hash;
    },
    [api, signer, selectedAccount, refetch, _execLiveTx, _simulateTx]
  );

  const reward = useCallback(
    async (address: string, jobId: string, amount: bigint): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");

      if (USE_LIVE_TXS && api && signer) {
        const abi = await loadAbiJson("reputation");
        const contract = createContract(api, abi, CONFIG.reputationAddress);
        const hash = await _execLiveTx(() => buildRewardTx(api, contract, address, jobId, amount));
        if (isMounted.current) await refetch(address);
        return hash;
      }

      const hash = await _simulateTx();
      if (isMounted.current) {
        setScore((prev) => {
          if (!prev || prev.address !== address) return prev;
          const newScore = prev.score + amount;
          return { ...prev, score: newScore, tier: scoreToTier(newScore), reviewsCompleted: prev.reviewsCompleted + 1 };
        });
      }
      return hash;
    },
    [api, signer, selectedAccount, refetch, _execLiveTx, _simulateTx]
  );

  const resetTx = useCallback(() => {
    setTxStatus("idle");
    setTxError(null);
  }, []);

  return { score, isLoading, error, refetch, slash, reward, txStatus, txError, resetTx };
}
