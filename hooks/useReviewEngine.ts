"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConsensus,
  getFindings,
  addFinding,
  delay,
  mockTxHash,
} from "@/lib/mock-data";
import { useWallet } from "./useWallet";
import type { ConsensusState, Finding, FindingSeverity } from "@/types/review.types";
import type { TxStatus } from "@/types/staking.types";

interface UseReviewEngineResult {
  consensus: ConsensusState | null;
  findings: Finding[];
  isLoading: boolean;
  error: string | null;
  submitFinding: (
    jobId: string,
    severity: FindingSeverity,
    title: string,
    description: string
  ) => Promise<string>;
  refetchConsensus: (jobId: string) => Promise<void>;
  refetchFindings: (jobId: string) => Promise<void>;
  txStatus: TxStatus;
  txError: string | null;
  txHash: string | null;
  resetTx: () => void;
}

export function useReviewEngine(jobId?: string): UseReviewEngineResult {
  const { selectedAccount } = useWallet();
  const [consensus, setConsensus] = useState<ConsensusState | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refetchConsensus = useCallback(async (id: string) => {
    await delay(200);
    if (!isMounted.current) return;
    setConsensus(getConsensus(id));
  }, []);

  const refetchFindings = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    await delay(300);
    if (!isMounted.current) return;
    setFindings(getFindings(id));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!jobId) return;
    refetchConsensus(jobId);
    refetchFindings(jobId);
  }, [jobId, refetchConsensus, refetchFindings]);

  const submitFinding = useCallback(
    async (
      id: string,
      severity: FindingSeverity,
      title: string,
      description: string
    ): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");

      setTxStatus("pending");
      setTxError(null);
      setTxHash(null);

      await delay(200);
      setTxStatus("broadcast");
      await delay(600);

      const hash = mockTxHash();
      setTxHash(hash);
      setTxStatus("inBlock");
      await delay(800);
      setTxStatus("finalized");

      const finding: Finding = {
        id: `find-${id}-${Date.now()}`,
        jobId: id,
        reviewer: selectedAccount.address,
        severity,
        title,
        description,
        submittedAtBlock: 1_247_830 + Math.floor(Math.random() * 10),
      };

      addFinding(finding);

      if (isMounted.current) {
        setFindings(getFindings(id));
        setConsensus(getConsensus(id));
      }

      return hash;
    },
    [selectedAccount]
  );

  const resetTx = useCallback(() => {
    setTxStatus("idle");
    setTxError(null);
    setTxHash(null);
  }, []);

  return {
    consensus,
    findings,
    isLoading,
    error,
    submitFinding,
    refetchConsensus,
    refetchFindings,
    txStatus,
    txError,
    txHash,
    resetTx,
  };
}
