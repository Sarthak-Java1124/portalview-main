import { ContractPromise } from "@polkadot/api-contract";
import type { ApiPromise } from "@polkadot/api";
import type { WeightV2 } from "@polkadot/types/interfaces";

export type ContractName = "escrow" | "reputation" | "review_engine";

type AbiJson = Record<string, unknown>;

const abiCache = new Map<ContractName, AbiJson>();

export async function loadAbiJson(name: ContractName): Promise<AbiJson> {
  const cached = abiCache.get(name);
  if (cached) return cached;

  const response = await fetch(`/abi/${name}.json`);
  if (!response.ok) {
    throw new Error(
      `Failed to load ABI for "${name}": HTTP ${response.status}`
    );
  }

  const json = (await response.json()) as AbiJson;
  abiCache.set(name, json);
  return json;
}

export function createContract(
  api: ApiPromise,
  abiJson: AbiJson,
  address: string
): ContractPromise {
  return new ContractPromise(api, abiJson, address);
}

export function buildGasLimit(api: ApiPromise): WeightV2 {
  // Use half the max block weight so dry-run queries always have enough gas
  const blockWeights = api.consts.system?.blockWeights as
    | { maxBlock?: { refTime?: { toBigInt?(): bigint }; proofSize?: { toBigInt?(): bigint } } }
    | undefined;
  const refTime   = blockWeights?.maxBlock?.refTime?.toBigInt?.()   ?? 500_000_000_000n;
  const proofSize = blockWeights?.maxBlock?.proofSize?.toBigInt?.() ?? 5_242_880n;
  return api.registry.createType("WeightV2", {
    refTime:   refTime   / 2n,
    proofSize: proofSize / 2n,
  }) as unknown as WeightV2;
}

export function extractOkValue(
  output: { toPrimitive: () => unknown } | null
): unknown {
  if (!output) return null;
  const primitive = output.toPrimitive();
  if (
    typeof primitive === "object" &&
    primitive !== null &&
    "ok" in primitive
  ) {
    return (primitive as Record<string, unknown>).ok;
  }
  return null;
}
