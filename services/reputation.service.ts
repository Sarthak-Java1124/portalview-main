import type { ContractPromise } from "@polkadot/api-contract";
import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { ReputationError } from "@/types/api.types";
import type { ReputationScore, ReputationTier } from "@/types/reputation.types";
import { scoreToTier } from "@/lib/format";
import { buildGasLimit, extractOkValue } from "./contract.service";

interface RawReputationScore {
  address: string;
  score: string | number;
  tier: string;
  reviewsCompleted: number;
  slashCount: number;
}

function parseReputationScore(raw: unknown): ReputationScore | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;

  const r = raw as RawReputationScore;
  const score = BigInt(String(r.score ?? 0));
  return {
    address: String(r.address),
    score,
    tier: (r.tier as ReputationTier) ?? scoreToTier(score),
    reviewsCompleted: Number(r.reviewsCompleted ?? 0),
    slashCount: Number(r.slashCount ?? 0),
  };
}

export async function queryScore(
  api: ApiPromise,
  contract: ContractPromise,
  caller: string,
  address: string
): Promise<ReputationScore | null> {
  try {
    const { result, output } = await contract.query["get_score"](
      caller,
      { gasLimit: buildGasLimit(api), storageDepositLimit: null },
      address
    );

    if (result.isErr) return null;

    const value = extractOkValue(output);
    return parseReputationScore(value);
  } catch (cause) {
    throw new ReputationError("Failed to query reputation score", cause);
  }
}

export async function queryLeaderboard(
  api: ApiPromise,
  contract: ContractPromise,
  caller: string,
  offset: number,
  limit: number
): Promise<ReputationScore[]> {
  try {
    const { result, output } = await contract.query["get_leaderboard"](
      caller,
      { gasLimit: buildGasLimit(api), storageDepositLimit: null },
      offset,
      limit
    );

    if (result.isErr || !output) return [];

    const value = extractOkValue(output);
    if (!Array.isArray(value)) return [];
    return value
      .map(parseReputationScore)
      .filter((s): s is ReputationScore => s !== null);
  } catch (cause) {
    throw new ReputationError("Failed to query leaderboard", cause);
  }
}

export function buildSlashTx(
  api: ApiPromise,
  contract: ContractPromise,
  account: string,
  jobId: string,
  amount: bigint
): SubmittableExtrinsic<"promise"> {
  return contract.tx["slash"](
    { gasLimit: buildGasLimit(api), storageDepositLimit: null },
    account,
    jobId,
    amount
  );
}

export function buildRewardTx(
  api: ApiPromise,
  contract: ContractPromise,
  account: string,
  jobId: string,
  amount: bigint
): SubmittableExtrinsic<"promise"> {
  return contract.tx["reward"](
    {
      gasLimit: buildGasLimit(api),
      storageDepositLimit: null,
      value: amount,
    },
    account,
    jobId,
    amount
  );
}
