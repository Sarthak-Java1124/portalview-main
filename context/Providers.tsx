"use client";

import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";
import { ApiProvider } from "./ApiContext";
import { WalletProvider } from "./WalletContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ApiProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </ApiProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
