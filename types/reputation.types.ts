export type ReputationTier =
  | "Novice"
  | "Apprentice"
  | "Journeyman"
  | "Senior"
  | "Expert"
  | "Legend";

export interface ReputationScore {
  address: string;
  score: bigint;
  tier: ReputationTier;
  reviewsCompleted: number;
  slashCount: number;
}

export interface Reviewer {
  address: string;
  reputation: ReputationScore;
  activeJobs: number;
  totalEarned: bigint;
}

export interface SlashEvent {
  reviewer: string;
  jobId: string;
  amount: bigint;
  reason: string;
  atBlock: number;
}
