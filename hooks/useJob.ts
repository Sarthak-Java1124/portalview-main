"use client";

import { useEffect, useRef, useState } from "react";
import { useApi } from "./useApi";
import { useWallet } from "./useWallet";
import { getJob } from "@/lib/mock-data";
import { loadAbiJson, createContract } from "@/services/contract.service";
import { queryJobs } from "@/services/reviewEngine.service";
import { USE_LIVE_TXS, CONFIG, ZERO_CALLER } from "@/lib/constants";
import type { ReviewJob } from "@/types/review.types";

export function useJob(jobId: string | null): { job: ReviewJob | null; isLoading: boolean } {
  const { api } = useApi();
  const { selectedAccount } = useWallet();
  const [job, setJob] = useState<ReviewJob | null>(null);
  const [isLoading, setIsLoading] = useState(!!jobId);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!jobId) { setIsLoading(false); return; }

    if (USE_LIVE_TXS && api) {
      (async () => {
        try {
          const caller = selectedAccount?.address ?? ZERO_CALLER;
          const abi = await loadAbiJson("review_engine");
          const contract = createContract(api, abi, CONFIG.reviewEngineAddress);
          const jobs = await queryJobs(api, contract, caller, 0, 50);
          if (!isMounted.current) return;
          setJob(jobs.find((j) => j.id === jobId) ?? null);
        } catch {
          if (isMounted.current) setJob(null);
        } finally {
          if (isMounted.current) setIsLoading(false);
        }
      })();
      return;
    }

    setJob(getJob(jobId));
    setIsLoading(false);
  }, [jobId, api, selectedAccount]);

  return { job, isLoading };
}
