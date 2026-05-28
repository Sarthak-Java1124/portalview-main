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
  return api.registry.createType("WeightV2", {
    refTime: 30_000_000_000,
    proofSize: 1_048_576,
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
