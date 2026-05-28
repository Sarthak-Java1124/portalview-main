import type { ContractPromise } from "@polkadot/api-contract";
import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { EscrowError } from "@/types/api.types";
import type { EscrowState, EscrowStatus } from "@/types/staking.types";
import { buildGasLimit, extractOkValue } from "./contract.service";

interface RawEscrowState {
  jobId: string;
  submitter: string;
  amount: string | number;
  status: string;
  openedAtBlock: number;
}

function parseEscrowState(raw: unknown): EscrowState | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;

  const r = raw as RawEscrowState;
  return {
    jobId: String(r.jobId),
    submitter: String(r.submitter),
    amount: BigInt(String(r.amount)),
    status: (r.status as EscrowStatus) ?? "None",
    openedAtBlock: Number(r.openedAtBlock),
  };
}

export async function queryEscrowState(
  api: ApiPromise,
  contract: ContractPromise,
  caller: string,
  jobId: string
): Promise<EscrowState | null> {
  try {
    const { result, output } = await contract.query["get_state"](
      caller,
      { gasLimit: buildGasLimit(api), storageDepositLimit: null },
      jobId
    );

    if (result.isErr) return null;

    const value = extractOkValue(output);
    return parseEscrowState(value);
  } catch (cause) {
    throw new EscrowError("Failed to query escrow state", cause);
  }
}

export function buildStakeTx(
  api: ApiPromise,
  contract: ContractPromise,
  jobId: string,
  description: string,
  amount: bigint
): SubmittableExtrinsic<"promise"> {
  return contract.tx["stake"](
    {
      gasLimit: buildGasLimit(api),
      storageDepositLimit: null,
      value: amount,
    },
    jobId,
    description
  );
}

export function buildReleaseTx(
  api: ApiPromise,
  contract: ContractPromise,
  jobId: string
): SubmittableExtrinsic<"promise"> {
  return contract.tx["release"](
    { gasLimit: buildGasLimit(api), storageDepositLimit: null },
    jobId
  );
}

export function buildCancelTx(
  api: ApiPromise,
  contract: ContractPromise,
  jobId: string
): SubmittableExtrinsic<"promise"> {
  return contract.tx["cancel"](
    { gasLimit: buildGasLimit(api), storageDepositLimit: null },
    jobId
  );
}
