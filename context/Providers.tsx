"use client";

import { ApiProvider } from "./ApiContext";
import { WalletProvider } from "./WalletContext";
import { ToastProvider } from "./ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider>
      <WalletProvider>
        <ToastProvider>{children}</ToastProvider>
      </WalletProvider>
    </ApiProvider>
  );
}
