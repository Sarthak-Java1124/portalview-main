"use client";

import { useEffect, useRef, useState } from "react";
import { useApi } from "./useApi";
import { IS_LIVE_MODE } from "@/lib/constants";
import { delay } from "@/lib/mock-data";

interface BalanceState {
  free: bigint;
  reserved: bigint;
  isLoading: boolean;
  error: string | null;
}

const MOCK_FREE     = 500n * 1_000_000_000_000n;
const MOCK_RESERVED =  30n * 1_000_000_000_000n;

export function useBalance(address: string | null): BalanceState {
  const { api } = useApi();
  const [free, setFree] = useState<bigint>(MOCK_FREE);
  const [reserved, setReserved] = useState<bigint>(MOCK_RESERVED);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!IS_LIVE_MODE || !api || !address) {
      let cancelled = false;
      delay(300).then(() => {
        if (!cancelled && isMounted.current) {
          setFree(MOCK_FREE);
          setReserved(MOCK_RESERVED);
          setIsLoading(false);
        }
      });
      return () => { cancelled = true; };
    }

    setIsLoading(true);
    setError(null);
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        unsub = (await api.query.system.account(
          address,
          (accountInfo: unknown) => {
            if (!isMounted.current) return;
            const info = accountInfo as {
              data: {
                free: { toString(): string };
                reserved: { toString(): string };
              };
            };
            setFree(BigInt(info.data.free.toString()));
            setReserved(BigInt(info.data.reserved.toString()));
            setIsLoading(false);
          }
        )) as unknown as () => void;
      } catch (err) {
        if (!isMounted.current) return;
        setError(err instanceof Error ? err.message : "Failed to fetch balance");
        setIsLoading(false);
      }
    })();

    return () => { if (unsub) unsub(); };
  }, [api, address]);

  return { free, reserved, isLoading, error };
}
