"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getJobs, delay } from "@/lib/mock-data";
import { PAGE_SIZE } from "@/lib/constants";
import type { ReviewJob } from "@/types/review.types";

interface UseReviewQueueResult {
  jobs: ReviewJob[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReviewQueue(): UseReviewQueueResult {
  const [jobs, setJobs] = useState<ReviewJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchPage = useCallback(async (pageOffset: number, append: boolean) => {
    setIsLoading(true);
    setError(null);
    await delay(350);
    if (!isMounted.current) return;

    const page = getJobs(pageOffset, PAGE_SIZE);
    setJobs((prev) => (append ? [...prev, ...page] : page));
    setOffset(pageOffset + page.length);
    setHasMore(page.length === PAGE_SIZE);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await fetchPage(offset, true);
  }, [isLoading, hasMore, offset, fetchPage]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await fetchPage(0, false);
  }, [fetchPage]);

  return { jobs, isLoading, error, hasMore, loadMore, refresh };
}
