export type UserIntent = "submitter" | "reviewer" | "both";

export interface Profile {
  id: string;
  created_at: string;
  username: string | null;
  intent: UserIntent | null;
  bio: string | null;
  github_url: string | null;
  wallet_address: string | null;
}

export const INTENT_LABELS: Record<UserIntent, string> = {
  submitter: "Submitter",
  reviewer:  "Reviewer",
  both:      "Both",
};

export const INTENT_DESCRIPTIONS: Record<UserIntent, string> = {
  submitter: "I submit ink! contracts for security review",
  reviewer:  "I audit contracts and earn POT rewards",
  both:      "I do both — submit and review",
};
