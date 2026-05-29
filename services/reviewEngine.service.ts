import type { ContractPromise } from "@polkadot/api-contract";
import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { ReviewEngineError } from "@/types/api.types";
import type {
  ConsensusState,
  Finding,
  FindingSeverity,
  ReviewJob,
  ReviewJobStatus,
} from "@/types/review.types";
import { buildGasLimit, extractOkValue } from "./contract.service";
import { REVIEWER_BOND_PLANCK } from "@/lib/constants";

interface RawConsensusState {
  jobId: string;
  totalFindings: number;
  confirmedFindings: number;
  threshold: number;
  reached: boolean;
  votingEnds: number;
}

interface RawFinding {
  id: string;
  jobId: string;
  reviewer: string;
  severity: string;
  title: string;
  description: string;
  submittedAtBlock: number;
}

interface RawReviewJob {
  id: string;
  submitter: string;
  contractHash: string;
  description: string;
  stakeAmount: string | number;
  rewardPool: string | number;
  status: string;
  openedAtBlock: number;
  closesAtBlock: number;
  findingCount: number;
}

function parseConsensusState(raw: unknown): ConsensusState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawConsensusState;
  return {
    jobId: String(r.jobId),
    totalFindings: Number(r.totalFindings ?? 0),
    confirmedFindings: Number(r.confirmedFindings ?? 0),
    threshold: Number(r.threshold ?? 2),
    reached: Boolean(r.reached),
    votingEnds: Number(r.votingEnds ?? 0),
  };
}

function parseFinding(raw: unknown): Finding | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawFinding;
  return {
    id: String(r.id),
    jobId: String(r.jobId),
    reviewer: String(r.reviewer),
    severity: (r.severity as FindingSeverity) ?? "Informational",
    title: String(r.title),
    description: String(r.description),
    submittedAtBlock: Number(r.submittedAtBlock ?? 0),
  };
}

function parseReviewJob(raw: unknown): ReviewJob | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawReviewJob;
  return {
    id: String(r.id),
    submitter: String(r.submitter),
    contractHash: String(r.contractHash),
    description: String(r.description),
    stakeAmount: BigInt(String(r.stakeAmount ?? 0)),
    rewardPool: BigInt(String(r.rewardPool ?? 0)),
    status: (r.status as ReviewJobStatus) ?? "Open",
    openedAtBlock: Number(r.openedAtBlock ?? 0),
    closesAtBlock: Number(r.closesAtBlock ?? 0),
    findingCount: Number(r.findingCount ?? 0),
  };
}

export async function queryConsensus(
  api: ApiPromise,
  contract: ContractPromise,
  caller: string,
  jobId: string
): Promise<ConsensusState | null> {
  try {
    const { result, output } = await contract.query["getConsensus"](
      caller,
      { gasLimit: buildGasLimit(api), storageDepositLimit: null },
      jobId
    );

    if (result.isErr) return null;

    const value = extractOkValue(output);
    return parseConsensusState(value);
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    console.error("[reviewEngine] queryConsensus failed:", cause);
    throw new ReviewEngineError(`Failed to query consensus: ${msg}`, cause);
  }
}

export async function queryJobs(
  api: ApiPromise,
  contract: ContractPromise,
  caller: string,
  offset: number,
  limit: number
): Promise<ReviewJob[]> {
  try {
    const { result, output } = await contract.query["getJobs"](
      caller,
      { gasLimit: buildGasLimit(api), storageDepositLimit: null },
      offset,
      limit
    );

    if (result.isErr || !output) return [];

    const value = extractOkValue(output);
    if (!Array.isArray(value)) return [];
    return value
      .map(parseReviewJob)
      .filter((j): j is ReviewJob => j !== null);
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    console.error("[reviewEngine] queryJobs failed:", cause);
    throw new ReviewEngineError(`Failed to query review jobs: ${msg}`, cause);
  }
}

export async function queryFindings(
  api: ApiPromise,
  contract: ContractPromise,
  caller: string,
  jobId: string
): Promise<Finding[]> {
  try {
    const { result, output } = await contract.query["getFindings"](
      caller,
      { gasLimit: buildGasLimit(api), storageDepositLimit: null },
      jobId
    );

    if (result.isErr || !output) return [];

    const value = extractOkValue(output);
    if (!Array.isArray(value)) return [];
    return value
      .map(parseFinding)
      .filter((f): f is Finding => f !== null);
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    console.error("[reviewEngine] queryFindings failed:", cause);
    throw new ReviewEngineError(`Failed to query findings: ${msg}`, cause);
  }
}

/** Build a tx to submit a finding. Attaches REVIEWER_BOND_PLANCK as the reviewer's bond. */
export function buildSubmitFindingTx(
  api: ApiPromise,
  contract: ContractPromise,
  jobId: string,
  severity: FindingSeverity,
  title: string,
  description: string
): SubmittableExtrinsic<"promise"> {
  return contract.tx["submitFinding"](
    {
      gasLimit: buildGasLimit(api),
      storageDepositLimit: null,
      value: REVIEWER_BOND_PLANCK,
    },
    jobId,
    severity,
    title,
    description
  );
}

/** Build a tx for a reviewer to claim their reward share after consensus. */
export function buildClaimRewardTx(
  api: ApiPromise,
  contract: ContractPromise,
  jobId: string
): SubmittableExtrinsic<"promise"> {
  return contract.tx["claimReward"](
    { gasLimit: buildGasLimit(api), storageDepositLimit: null },
    jobId
  );
}

/** Build a tx for the admin to slash a reviewer's bond (admin only). */
export function buildSlashReviewerTx(
  api: ApiPromise,
  contract: ContractPromise,
  jobId: string,
  reviewer: string
): SubmittableExtrinsic<"promise"> {
  return contract.tx["slashReviewer"](
    { gasLimit: buildGasLimit(api), storageDepositLimit: null },
    jobId,
    reviewer
  );
}

/** Build a tx to register a new review job. Attach stake as the transferred value. */
export function buildRegisterJobTx(
  api: ApiPromise,
  contract: ContractPromise,
  jobId: string,
  description: string,
  contractHash: string,
  stakeAmount: bigint
): SubmittableExtrinsic<"promise"> {
  return contract.tx["registerJob"](
    {
      gasLimit: buildGasLimit(api),
      storageDepositLimit: null,
      value: stakeAmount,
    },
    jobId,
    description,
    contractHash
  );
}
