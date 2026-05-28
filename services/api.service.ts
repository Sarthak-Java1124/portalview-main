import { ApiPromise, WsProvider } from "@polkadot/api";
import { CONFIG } from "@/lib/constants";
import { ApiConnectionError } from "@/types/api.types";

const CONNECT_TIMEOUT_MS = 10_000;

let apiInstance: ApiPromise | null = null;
let wsProvider: WsProvider | null = null;
let pendingCreation: Promise<ApiPromise> | null = null;

async function teardown(): Promise<void> {
  const [inst, prov] = [apiInstance, wsProvider];
  apiInstance = null;
  wsProvider = null;
  // Disconnect api first (it owns the provider); fall back to raw provider disconnect
  if (inst) {
    await inst.disconnect().catch(() => undefined);
  } else if (prov) {
    await prov.disconnect().catch(() => undefined);
  }
}

async function createConnection(): Promise<ApiPromise> {
  await teardown();

  wsProvider = new WsProvider(CONFIG.wsProviderUrl, 2_500);

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new ApiConnectionError(
            `Node connection timed out after ${CONNECT_TIMEOUT_MS / 1_000}s. Is substrate-contracts-node running at ${CONFIG.wsProviderUrl}?`
          )
        ),
      CONNECT_TIMEOUT_MS
    )
  );

  try {
    apiInstance = await Promise.race([
      ApiPromise.create({ provider: wsProvider }),
      timeout,
    ]);
    return apiInstance;
  } catch (cause) {
    await teardown();
    throw cause instanceof ApiConnectionError
      ? cause
      : new ApiConnectionError(
          `Failed to connect to ${CONFIG.wsProviderUrl}`,
          cause
        );
  }
}

export async function getApi(): Promise<ApiPromise> {
  if (apiInstance?.isConnected) return apiInstance;
  if (pendingCreation) return pendingCreation;

  pendingCreation = createConnection().finally(() => {
    pendingCreation = null;
  });

  return pendingCreation;
}

export async function disconnectApi(): Promise<void> {
  pendingCreation = null;
  await teardown();
}
