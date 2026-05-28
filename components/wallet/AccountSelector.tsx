"use client";

import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { formatAddress } from "@/lib/format";

interface AccountSelectorProps {
  accounts: InjectedAccountWithMeta[];
  selected: InjectedAccountWithMeta | null;
  onSelect: (account: InjectedAccountWithMeta) => void;
}

export function AccountSelector({
  accounts,
  selected,
  onSelect,
}: AccountSelectorProps) {
  return (
    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      {accounts.map((account) => {
        const isSelected = account.address === selected?.address;
        return (
          <button
            key={account.address}
            onClick={() => onSelect(account)}
            className={[
              "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border",
              isSelected
                ? "bg-violet-600/20 border-violet-500/30 text-white"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <span className="h-8 w-8 rounded-full bg-violet-600/30 flex items-center justify-center text-sm font-bold text-violet-300 shrink-0">
              {account.meta.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm truncate">
                {account.meta.name ?? "Unnamed Account"}
              </span>
              <span className="text-xs text-white/40 font-mono">
                {formatAddress(account.address)}
              </span>
            </div>
            {isSelected && (
              <span className="ml-auto text-violet-400 text-sm">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
