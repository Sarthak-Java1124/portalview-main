"use client";

import { useEffect, useState } from "react";
import { delay } from "@/lib/mock-data";

interface BalanceState {
  free: bigint;
  reserved: bigint;
  isLoading: boolean;
  error: string | null;
}

// Mock balance: 500 POT free, 30 POT reserved (staked in an open review job)
const MOCK_FREE     = 500n * 1_000_000_000_000n;
const MOCK_RESERVED =  30n * 1_000_000_000_000n;

export function useBalance(_address: string | null): BalanceState {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    delay(300).then(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [_address]);

  return {
    free: MOCK_FREE,
    reserved: MOCK_RESERVED,
    isLoading,
    error: null,
  };
}
