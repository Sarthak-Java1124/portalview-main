"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getEscrow,
  addJob,
  updateEscrowStatus,
  delay,
  mockTxHash,
} from "@/lib/mock-data";
import { useWallet } from "./useWallet";
import type { EscrowState, TxStatus } from "@/types/staking.types";
import type { ReviewJob, ConsensusState } from "@/types/review.types";
import { REVIEW_WINDOW_BLOCKS, CONSENSUS_THRESHOLD } from "@/lib/constants";

interface UseEscrowResult {
  status: TxStatus;
  txHash: string | null;
  blockHash: string | null;
  error: string | null;
  escrowState: EscrowState | null;
  isLoadingState: boolean;
  stake: (
    jobId: string,
    description: string,
    amount: bigint,
    githubUrl?: string,
    contractHash?: string
  ) => Promise<string>;
  release: (jobId: string) => Promise<string>;
  cancel: (jobId: string) => Promise<string>;
  refetchState: (jobId: string) => Promise<void>;
  reset: () => void;
}

const OPENED_AT_BLOCK = 1_247_830;

export function useEscrow(): UseEscrowResult {
  const { selectedAccount } = useWallet();
  const [escrowState, setEscrowState] = useState<EscrowState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockHash, setBlockHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refetchState = useCallback(async (jobId: string) => {
    setIsLoadingState(true);
    await delay(250);
    if (!isMounted.current) return;
    setEscrowState(getEscrow(jobId));
    setIsLoadingState(false);
  }, []);

  const simulateTx = useCallback(async (): Promise<string> => {
    setStatus("pending");
    setError(null);
    setTxHash(null);
    setBlockHash(null);
    await delay(200);
    setStatus("broadcast");
    await delay(600);
    const hash = mockTxHash();
    const block = mockTxHash();
    setTxHash(hash);
    setBlockHash(block);
    setStatus("inBlock");
    await delay(800);
    setStatus("finalized");
    return hash;
  }, []);

  const stake = useCallback(
    async (
      jobId: string,
      description: string,
      amount: bigint,
      githubUrl?: string,
      contractHash?: string
    ): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");

      const hash = await simulateTx();

      const newJob: ReviewJob = {
        id: jobId,
        submitter: selectedAccount.address,
        contractHash: contractHash ?? mockTxHash(),
        githubUrl,
        description,
        stakeAmount: amount,
        rewardPool: amount,
        status: "Open",
        openedAtBlock: OPENED_AT_BLOCK,
        closesAtBlock: OPENED_AT_BLOCK + REVIEW_WINDOW_BLOCKS,
        findingCount: 0,
      };

      const newEscrow: EscrowState = {
        jobId,
        submitter: selectedAccount.address,
        amount,
        status: "Staked",
        openedAtBlock: OPENED_AT_BLOCK,
      };

      const newConsensus: ConsensusState = {
        jobId,
        totalFindings: 0,
        confirmedFindings: 0,
        threshold: CONSENSUS_THRESHOLD,
        reached: false,
        votingEnds: OPENED_AT_BLOCK + REVIEW_WINDOW_BLOCKS,
      };

      addJob(newJob, newEscrow, newConsensus);

      if (isMounted.current) setEscrowState(newEscrow);
      return hash;
    },
    [selectedAccount, simulateTx]
  );

  const release = useCallback(
    async (jobId: string): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");
      const hash = await simulateTx();
      updateEscrowStatus(jobId, "Released");
      if (isMounted.current) setEscrowState(getEscrow(jobId));
      return hash;
    },
    [selectedAccount, simulateTx]
  );

  const cancel = useCallback(
    async (jobId: string): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");
      const hash = await simulateTx();
      updateEscrowStatus(jobId, "Cancelled");
      if (isMounted.current) setEscrowState(getEscrow(jobId));
      return hash;
    },
    [selectedAccount, simulateTx]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setBlockHash(null);
    setError(null);
  }, []);

  return {
    status,
    txHash,
    blockHash,
    error,
    escrowState,
    isLoadingState,
    stake,
    release,
    cancel,
    refetchState,
    reset,
  };
}
