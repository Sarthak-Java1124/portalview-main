"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "./useApi";
import { useWallet } from "./useWallet";
import { getConsensus, getFindings, addFinding, delay, mockTxHash } from "@/lib/mock-data";
import { loadAbiJson, createContract } from "@/services/contract.service";
import { queryConsensus, queryFindings, buildSubmitFindingTx } from "@/services/reviewEngine.service";
import { USE_LIVE_TXS, CONFIG, ZERO_CALLER } from "@/lib/constants";
import type { ConsensusState, Finding, FindingSeverity } from "@/types/review.types";
import type { TxStatus } from "@/types/staking.types";
import type { Signer, SubmittableExtrinsic } from "@polkadot/api/types";

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
  const { api } = useApi();
  const { selectedAccount, signer } = useWallet();
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
    if (USE_LIVE_TXS && api) {
      try {
        const caller = selectedAccount?.address ?? ZERO_CALLER;
        const abi = await loadAbiJson("review_engine");
        const contract = createContract(api, abi, CONFIG.reviewEngineAddress);
        const data = await queryConsensus(api, contract, caller, id);
        if (!isMounted.current) return;
        setConsensus(data);
      } catch {
        // leave state unchanged on error
      }
      return;
    }

    await delay(200);
    if (!isMounted.current) return;
    setConsensus(getConsensus(id));
  }, [api, selectedAccount]);

  const refetchFindings = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    if (USE_LIVE_TXS && api) {
      try {
        const caller = selectedAccount?.address ?? ZERO_CALLER;
        const abi = await loadAbiJson("review_engine");
        const contract = createContract(api, abi, CONFIG.reviewEngineAddress);
        const data = await queryFindings(api, contract, caller, id);
        if (!isMounted.current) return;
        setFindings(data);
      } catch (err) {
        if (!isMounted.current) return;
        setError(err instanceof Error ? err.message : "Failed to load findings");
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
      return;
    }

    await delay(300);
    if (!isMounted.current) return;
    setFindings(getFindings(id));
    setIsLoading(false);
  }, [api, selectedAccount]);

  useEffect(() => {
    if (!jobId) return;
    refetchConsensus(jobId);
    refetchFindings(jobId);
  }, [jobId, refetchConsensus, refetchFindings]);

  const _execLiveTx = useCallback(
    async (buildTxFn: () => SubmittableExtrinsic<"promise">): Promise<string> => {
      if (!api || !signer || !selectedAccount) throw new Error("Not connected");
      const _signer = signer as Signer;
      const _address = selectedAccount.address;

      setTxStatus("pending");
      setTxError(null);
      setTxHash(null);

      const tx = buildTxFn();
      return new Promise((resolve, reject) => {
        tx.signAndSend(_address, { signer: _signer }, (result) => {
          const { status: s, dispatchError, isError } = result;
          if (s.isBroadcast) setTxStatus("broadcast");
          else if (s.isInBlock) setTxStatus("inBlock");
          else if (s.isFinalized) {
            const h = result.txHash.toHex();
            setTxHash(h);
            setTxStatus("finalized");
            resolve(h);
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

  const submitFinding = useCallback(
    async (
      id: string,
      severity: FindingSeverity,
      title: string,
      description: string
    ): Promise<string> => {
      if (!selectedAccount) throw new Error("Wallet not connected");

      if (USE_LIVE_TXS && api && signer) {
        const abi = await loadAbiJson("review_engine");
        const contract = createContract(api, abi, CONFIG.reviewEngineAddress);
        const hash = await _execLiveTx(() =>
          buildSubmitFindingTx(api, contract, id, severity, title, description)
        );
        if (isMounted.current) {
          await refetchConsensus(id);
          await refetchFindings(id);
        }
        return hash;
      }

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
    [api, signer, selectedAccount, refetchConsensus, refetchFindings, _execLiveTx]
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
