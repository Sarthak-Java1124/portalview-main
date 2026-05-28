"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";
import { useApi } from "@/hooks/useApi";

const FEATURES = [
  {
    icon: "⊕",
    title: "Submit & Stake",
    description:
      "Upload your ink! contract and stake POT tokens to open a security review. Funds are held in escrow until consensus is reached.",
  },
  {
    icon: "⊞",
    title: "Review & Earn",
    description:
      "Senior reviewers stake reputation to submit findings. Valid findings earn rewards; invalid ones trigger slashing.",
  },
  {
    icon: "◈",
    title: "Consensus Protocol",
    description:
      "A 2-of-3 confirmation model from verified reviewers determines finding validity — fully on-chain, zero trust required.",
  },
  {
    icon: "⬡",
    title: "Reputation System",
    description:
      "Build your on-chain reviewer reputation over time. Higher scores unlock more review opportunities and greater rewards.",
  },
];

export default function LandingPage() {
  const { isConnected, isConnecting, connect } = useWallet();
  const { status } = useApi();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5 text-white font-bold text-lg">
          <span className="text-violet-400 text-2xl">⬡</span>
          PortalReview
        </div>
        <div className="flex items-center gap-3">
          {status === "ready" && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Portaldot connected
            </span>
          )}
          {!isConnected ? (
            <Button
              variant="primary"
              size="sm"
              loading={isConnecting}
              onClick={connect}
            >
              Connect Wallet
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button variant="primary" size="sm">
                Open App
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold tracking-wide">
              Portaldot Online Mini Hackathon S1
            </span>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
              Peer Code Review
              <br />
              <span className="text-violet-400">on-chain.</span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl leading-relaxed">
              Submit ink! contracts, stake POT tokens, and receive
              reputation-backed security reviews — fully trustless,
              slash-protected, and incentive-aligned.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {isConnected ? (
              <>
                <Link href="/dashboard">
                  <Button variant="primary" size="lg">
                    View Dashboard
                  </Button>
                </Link>
                <Link href="/submit">
                  <Button variant="ghost" size="lg">
                    Submit Contract
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  loading={isConnecting}
                  onClick={connect}
                >
                  Connect Wallet to Start
                </Button>
                <Link href="/leaderboard">
                  <Button variant="ghost" size="lg">
                    View Leaderboard
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 w-full mt-8 text-left">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-9 w-9 rounded-xl bg-violet-600/20 flex items-center justify-center text-lg text-violet-400">
                    {f.icon}
                  </span>
                  <h3 className="font-semibold text-white text-sm">{f.title}</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-white/20 border-t border-white/5">
        PortalReview · Built on Portaldot · ink! smart contracts
      </footer>
    </div>
  );
}
