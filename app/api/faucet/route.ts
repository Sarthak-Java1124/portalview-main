import { NextRequest, NextResponse } from "next/server";

// Dev-only endpoint. Never ships to production.
export const runtime = "nodejs";

const FAUCET_AMOUNT_PLANCK = 10_000n * 1_000_000_000_000n; // 10,000 POT

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Faucet only available in development" }, { status: 403 });
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_PROVIDER_URL ?? "ws://127.0.0.1:9944";
  if (!wsUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_WS_PROVIDER_URL is not set" }, { status: 500 });
  }

  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address } = body;
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const { ApiPromise, WsProvider } = await import("@polkadot/api");
    const { Keyring } = await import("@polkadot/keyring");

    const provider = new WsProvider(wsUrl);
    const api = await ApiPromise.create({ provider });

    const keyring = new Keyring({ type: "sr25519" });
    const alice = keyring.addFromUri("//Alice");

    const txHash = await new Promise<string>((resolve, reject) => {
      api.tx.balances
        .transferKeepAlive(address, FAUCET_AMOUNT_PLANCK)
        .signAndSend(alice, ({ status, dispatchError, isError }) => {
          if (isError || dispatchError) {
            reject(new Error(dispatchError?.toString() ?? "Transaction failed"));
            return;
          }
          if (status.isFinalized) {
            resolve(status.asFinalized.toHex());
          }
        })
        .catch(reject);
    });

    await api.disconnect();

    return NextResponse.json({ success: true, txHash, amount: "10,000 POT" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Faucet request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
