import { NextResponse } from "next/server";

export async function GET() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_PROVIDER_URL ?? "ws://127.0.0.1:9944";

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    node: wsUrl,
    contracts: {
      escrow: process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? null,
      reputation: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS ?? null,
      reviewEngine: process.env.NEXT_PUBLIC_REVIEW_ENGINE_ADDRESS ?? null,
    },
  });
}
