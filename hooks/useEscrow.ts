"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "./useApi";
import { useWallet } from "./useWallet";
import { getEscrow, addJob, updateEscrowStatus, delay, mockTxHash } from "@/lib/mock-data";
import { loadAbiJson, createContract } from "@/services/contract.service";
import { queryEscrowState, buildStakeTx, buildReleaseTx, buildCancelTx } from "@/services/escrow.service";
import { USE_LIVE_TXS, CONFIG, REVIEW_WINDOW_BLOCKS, CONSENSUS_THRESHOLD } from "@/lib/constants";
import type { EscrowState, TxStatus } from "@/types/staking.types";
import type { ReviewJob, ConsensusState } from "@/types/review.types";
import type { Signer, SubmittableExtrinsic } from "@polkadot/api/types";

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
  const { api } = useApi();
  const { selectedAccount, signer } = useWallet();
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

    if (USE_LIVE_TXS && api && selectedAccount) {
      try {
        const abi = await loadAbiJson("escrow");
        const contract = createContract(api, abi, CONFIG.escrowAddress);
        const state = await queryEscrowState(api, contract, selectedAccount.address, jobId);
        if (!isMounted.current) return;
        setEscrowState(state);
      } catch {
        // leave state unchanged on error
      } finally {
        if (isMounted.current) setIsLoadingState(false);
      }
      return;
    }

    await delay(250);
    if (!isMounted.current) return;
    setEscrowState(getEscrow(jobId));
    setIsLoadingState(false);
  }, [api, selectedAccount]);

  const _execLiveTx = useCallback(
    async (buildTxFn: () => SubmittableExtrinsic<"promise">): Promise<string> => {
      if (!api || !signer || !selectedAccount) throw new Error("Not connected");
      const _signer = signer as Signer;
      const _address = selectedAccount.address;

      setStatus("pending");
      setError(null);
      setTxHash(null);
      setBlockHash(null);

      const tx = buildTxFn();
      return new Promise((resolve, reject) => {
        tx.signAndSend(_address, { signer: _signer }, (result) => {
          const { status: s, dispatchError, isError } = result;
          if (s.isBroadcast) setStatus("broadcast");
          else if (s.isInBlock) {
            setStatus("inBlock");
            setTxHash(result.txHash.toHex());
            setBlockHash(s.asInBlock.toHex());
          } else if (s.isFinalized) {
            const h = result.txHash.toHex();
            setStatus("finalized");
            setBlockHash(s.asFinalized.toHex());
            resolve(h);
          }
          if (isError || dispatchError) {
            const msg = dispatchError?.toString() ?? "Transaction failed";
            setStatus("error");
            setError(msg);
            reject(new Error(msg));
          }
        }).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Transaction error";
          setStatus("error");
          setError(msg);
          reject(err instanceof Error ? err : new Error(msg));
        });
      });
    },
    [api, signer, selectedAccount]
  );

  const _simulateTx = useCallback(async (): Promise<string> => {
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

      if (USE_LIVE_TXS && api && signer) {
        const abi = await loadAbiJson("escrow");
        const contract = createContract(api, abi, CONFIG.escrowAddress);
        const hash = await _execLiveTx(() => buildStakeTx(api, contract, jobId, description, amount));
        if (isMounted.current) await refetchState(jobId);
        return hash;
      }

      const hash = await _simulateTx();
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
    [api, signer, selectedAccount, refetchState, _execLiveTx, _simulateTx]
  );

  const release = useCallback(
    async (jobId: string): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");

      if (USE_LIVE_TXS && api && signer) {
        const abi = await loadAbiJson("escrow");
        const contract = createContract(api, abi, CONFIG.escrowAddress);
        const hash = await _execLiveTx(() => buildReleaseTx(api, contract, jobId));
        if (isMounted.current) await refetchState(jobId);
        return hash;
      }

      const hash = await _simulateTx();
      updateEscrowStatus(jobId, "Released");
      if (isMounted.current) setEscrowState(getEscrow(jobId));
      return hash;
    },
    [api, signer, selectedAccount, refetchState, _execLiveTx, _simulateTx]
  );

  const cancel = useCallback(
    async (jobId: string): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");

      if (USE_LIVE_TXS && api && signer) {
        const abi = await loadAbiJson("escrow");
        const contract = createContract(api, abi, CONFIG.escrowAddress);
        const hash = await _execLiveTx(() => buildCancelTx(api, contract, jobId));
        if (isMounted.current) await refetchState(jobId);
        return hash;
      }

      const hash = await _simulateTx();
      updateEscrowStatus(jobId, "Cancelled");
      if (isMounted.current) setEscrowState(getEscrow(jobId));
      return hash;
    },
    [api, signer, selectedAccount, refetchState, _execLiveTx, _simulateTx]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setBlockHash(null);
    setError(null);
  }, []);

  return { status, txHash, blockHash, error, escrowState, isLoadingState, stake, release, cancel, refetchState, reset };
}
