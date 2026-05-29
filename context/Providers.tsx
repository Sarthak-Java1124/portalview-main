"use client";

import { ApiProvider } from "./ApiContext";
import { WalletProvider } from "./WalletContext";
import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ApiProvider>
        <WalletProvider>
          <ToastProvider>{children}</ToastProvider>
        </WalletProvider>
      </ApiProvider>
    </AuthProvider>
  );
}
