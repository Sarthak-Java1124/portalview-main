"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { Signer } from "@polkadot/api/types";
import { WalletError } from "@/types/api.types";
import { APP_DAPP_ID } from "@/lib/constants";
import { formatAddress } from "@/lib/format";
import { useToastContext } from "@/context/ToastContext";

interface WalletContextValue {
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  signer: Signer | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  selectAccount: (account: InjectedAccountWithMeta) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToastContext();
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<InjectedAccountWithMeta | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const resolveSignerForAccount = useCallback(
    async (account: InjectedAccountWithMeta) => {
      const { web3FromAddress } = await import("@polkadot/extension-dapp");
      const injector = await web3FromAddress(account.address);
      if (!isMounted.current) return;
      setSigner(injector.signer as Signer);
      setSelectedAccount(account);
    },
    []
  );

  const connect = useCallback(async () => {
    if (!isMounted.current) return;
    setIsConnecting(true);
    setError(null);

    try {
      const { web3Enable, web3Accounts } = await import(
        "@polkadot/extension-dapp"
      );
      const extensions = await web3Enable(APP_DAPP_ID);
      if (!isMounted.current) return;

      if (extensions.length === 0) {
        throw new WalletError(
          "No Polkadot{.js} extension found. Install it and reload."
        );
      }

      const injectedAccounts = await web3Accounts();
      if (!isMounted.current) return;

      if (injectedAccounts.length === 0) {
        throw new WalletError(
          "No accounts found. Create an account in the Polkadot{.js} extension."
        );
      }

      setAccounts(injectedAccounts);

      const firstAccount = injectedAccounts[0];
      if (firstAccount) {
        await resolveSignerForAccount(firstAccount);
        if (isMounted.current) {
          toast(`Wallet connected · ${formatAddress(firstAccount.address)}`, "success");
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      toast(message, "error");
    } finally {
      if (isMounted.current) setIsConnecting(false);
    }
  }, [resolveSignerForAccount, toast]);

  const selectAccount = useCallback(
    async (account: InjectedAccountWithMeta) => {
      setError(null);
      try {
        await resolveSignerForAccount(account);
        toast(`Switched to ${formatAddress(account.address)}`, "info");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to switch account";
        setError(message);
        toast(message, "error");
      }
    },
    [resolveSignerForAccount, toast]
  );

  const disconnect = useCallback(() => {
    setAccounts([]);
    setSelectedAccount(null);
    setSigner(null);
    setError(null);
    toast("Wallet disconnected", "info");
  }, [toast]);

  return (
    <WalletContext.Provider
      value={{
        accounts,
        selectedAccount,
        signer,
        isConnecting,
        isConnected: selectedAccount !== null,
        error,
        connect,
        disconnect,
        selectAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}
