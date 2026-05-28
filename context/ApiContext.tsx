"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ApiPromise } from "@polkadot/api";
import { getApi, disconnectApi } from "@/services/api.service";
import { IS_LIVE_MODE } from "@/lib/constants";

type ConnectionStatus = "disconnected" | "connecting" | "ready" | "error";

interface ApiContextValue {
  api: ApiPromise | null;
  status: ConnectionStatus;
  error: string | null;
  reconnect: () => void;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const connect = useCallback(async () => {
    // In demo/mock mode there is no live node — skip silently.
    if (!IS_LIVE_MODE) return;

    if (!isMounted.current) return;
    setStatus("connecting");
    setError(null);

    try {
      const instance = await getApi();
      if (!isMounted.current) return;
      setApi(instance);
      setStatus("ready");
    } catch (err) {
      if (!isMounted.current) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown connection error");
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      if (IS_LIVE_MODE) disconnectApi();
    };
  }, [connect]);

  return (
    <ApiContext.Provider value={{ api, status, error, reconnect: connect }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApiContext(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApiContext must be used within ApiProvider");
  return ctx;
}
