export type ReviewJobStatus =
  | "Open"
  | "InReview"
  | "Consensus"
  | "Finalized"
  | "Cancelled";

export type FindingSeverity =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Informational";

export interface ReviewJob {
  id: string;
  submitter: string;
  contractHash: string;
  githubUrl?: string;
  description: string;
  stakeAmount: bigint;
  rewardPool: bigint;
  status: ReviewJobStatus;
  openedAtBlock: number;
  closesAtBlock: number;
  findingCount: number;
}

export interface Finding {
  id: string;
  jobId: string;
  reviewer: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  lineStart?: number;
  lineEnd?: number;
  submittedAtBlock: number;
}

export interface ConsensusState {
  jobId: string;
  totalFindings: number;
  confirmedFindings: number;
  threshold: number;
  reached: boolean;
  votingEnds: number;
}
