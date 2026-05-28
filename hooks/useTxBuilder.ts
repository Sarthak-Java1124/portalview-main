"use client";

import { useCallback, useState } from "react";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { Signer } from "@polkadot/api/types";
import type { TxStatus } from "@/types/staking.types";

interface TxBuilderResult {
  status: TxStatus;
  txHash: string | null;
  blockHash: string | null;
  error: string | null;
  execute: (
    tx: SubmittableExtrinsic<"promise">,
    address: string,
    signer: Signer
  ) => Promise<string>;
  reset: () => void;
}

export function useTxBuilder(): TxBuilderResult {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockHash, setBlockHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    (
      tx: SubmittableExtrinsic<"promise">,
      address: string,
      signer: Signer
    ): Promise<string> => {
      setStatus("pending");
      setTxHash(null);
      setBlockHash(null);
      setError(null);

      return new Promise((resolve, reject) => {
        tx.signAndSend(address, { signer }, (result) => {
          const { status: txStatus, dispatchError, isError } = result;

          if (txStatus.isReady) {
            setStatus("pending");
          } else if (txStatus.isBroadcast) {
            setStatus("broadcast");
          } else if (txStatus.isInBlock) {
            setStatus("inBlock");
            setTxHash(result.txHash.toHex());
            setBlockHash(txStatus.asInBlock.toHex());
          } else if (txStatus.isFinalized) {
            const finalHash = result.txHash.toHex();
            setStatus("finalized");
            setBlockHash(txStatus.asFinalized.toHex());
            resolve(finalHash);
          }

          if (isError || dispatchError) {
            const msg = dispatchError
              ? dispatchError.toString()
              : "Transaction failed";
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
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setBlockHash(null);
    setError(null);
  }, []);

  return { status, txHash, blockHash, error, execute, reset };
}
