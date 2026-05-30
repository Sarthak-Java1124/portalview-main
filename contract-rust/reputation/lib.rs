#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Reputation contract — tracks reviewer scores and handles slash / reward.
///
/// Score thresholds (matching the frontend `scoreToTier` function):
///   Novice      0 – 249
///   Apprentice  250 – 999
///   Journeyman  1 000 – 1 999
///   Senior      2 000 – 4 999
///   Expert      5 000 – 9 999
///   Legend      10 000 +
///
/// Only the admin (ReviewEngine) may call `slash` and `reward`.
#[ink::contract]
mod reputation {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    // ─── Constants ───────────────────────────────────────────────────────────

    const LEGEND_THRESHOLD: u128     = 10_000;
    const EXPERT_THRESHOLD: u128     =  5_000;
    const SENIOR_THRESHOLD: u128     =  2_000;
    const JOURNEYMAN_THRESHOLD: u128 =  1_000;
    const APPRENTICE_THRESHOLD: u128 =    250;

    // ─── Types ───────────────────────────────────────────────────────────────

    #[derive(Debug, Clone, Default, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ScoreData {
        pub score: Balance,
        pub reviews_completed: u32,
        pub slash_count: u32,
    }

    /// The view struct returned by `get_score` and `get_leaderboard`.
    /// Matches the `ReputationScore` type expected by the frontend service layer.
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ReputationScore {
        pub address: AccountId,
        pub score: Balance,
        /// Human-readable tier string: "Novice" | "Apprentice" | "Journeyman" |
        /// "Senior" | "Expert" | "Legend"
        pub tier: String,
        pub reviews_completed: u32,
        pub slash_count: u32,
    }

    pub type ReputationResult = Result<(), String>;

    // ─── Events ──────────────────────────────────────────────────────────────

    #[ink(event)]
    pub struct ScoreChanged {
        #[ink(topic)]
        pub account: AccountId,
        /// Positive = reward, negative = slash.
        pub delta: i128,
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    #[ink(storage)]
    pub struct Reputation {
        /// Deployer — typically set to the ReviewEngine address post-deploy.
        admin: AccountId,
        /// Per-account score data.
        scores: Mapping<AccountId, ScoreData>,
        /// Ordered reviewer registry for leaderboard iteration.
        reviewer_count: u32,
        reviewers: Mapping<u32, AccountId>,
        /// Reverse-lookup: is this account already registered?
        is_registered: Mapping<AccountId, bool>,
    }

    // ─── Implementation ──────────────────────────────────────────────────────

    impl Default for Reputation {
        fn default() -> Self {
            Self::new()
        }
    }

    impl Reputation {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                admin: Self::env().caller(),
                scores: Mapping::default(),
                reviewer_count: 0,
                reviewers: Mapping::default(),
                is_registered: Mapping::default(),
            }
        }

        /// Transfer admin rights to the ReviewEngine contract.
        #[ink(message)]
        pub fn set_admin(&mut self, new_admin: AccountId) -> ReputationResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin"));
            }
            self.admin = new_admin;
            Ok(())
        }

        // ─── Internal helpers ────────────────────────────────────────────────

        fn score_to_tier(score: Balance) -> String {
            if score >= LEGEND_THRESHOLD {
                String::from("Legend")
            } else if score >= EXPERT_THRESHOLD {
                String::from("Expert")
            } else if score >= SENIOR_THRESHOLD {
                String::from("Senior")
            } else if score >= JOURNEYMAN_THRESHOLD {
                String::from("Journeyman")
            } else if score >= APPRENTICE_THRESHOLD {
                String::from("Apprentice")
            } else {
                String::from("Novice")
            }
        }

        fn ensure_registered(&mut self, account: AccountId) {
            if self.is_registered.get(account).unwrap_or(false) {
                return;
            }
            let idx = self.reviewer_count;
            self.reviewers.insert(idx, &account);
            self.is_registered.insert(account, &true);
            self.reviewer_count = self.reviewer_count.saturating_add(1);
        }

        fn build_reputation_score(&self, address: AccountId) -> ReputationScore {
            let data = self.scores.get(address).unwrap_or_default();
            ReputationScore {
                address,
                score: data.score,
                tier: Self::score_to_tier(data.score),
                reviews_completed: data.reviews_completed,
                slash_count: data.slash_count,
            }
        }

        // ─── Public messages ─────────────────────────────────────────────────

        /// Return the reputation score for an account, or `None` if unregistered.
        #[ink(message)]
        pub fn get_score(&self, account: AccountId) -> Option<ReputationScore> {
            if self.is_registered.get(account).unwrap_or(false) {
                Some(self.build_reputation_score(account))
            } else {
                None
            }
        }

        /// Deduct reputation from a reviewer for submitting a bad finding.
        /// Only callable by admin (ReviewEngine).
        #[ink(message)]
        pub fn slash(
            &mut self,
            account: AccountId,
            _job_id: String,
            amount: Balance,
        ) -> ReputationResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin can slash"));
            }

            self.ensure_registered(account);
            let mut data = self.scores.get(account).unwrap_or_default();
            let old_score = data.score;
            data.score = data.score.saturating_sub(amount);
            data.slash_count = data.slash_count.saturating_add(1);
            self.scores.insert(account, &data);

            // slash always decreases score; delta is non-positive
            let decreased = old_score.saturating_sub(data.score);
            #[allow(clippy::cast_possible_wrap)]
            let delta: i128 = 0_i128.saturating_sub(decreased as i128);
            self.env().emit_event(ScoreChanged { account, delta });
            Ok(())
        }

        /// Increment a reviewer's reputation after their finding is confirmed.
        /// The attached value (POT) is forwarded to the reviewer as a monetary reward.
        /// Only callable by admin (ReviewEngine).
        #[ink(message, payable)]
        pub fn reward(
            &mut self,
            account: AccountId,
            _job_id: String,
            amount: Balance,
        ) -> ReputationResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin can reward"));
            }

            self.ensure_registered(account);
            let mut data = self.scores.get(account).unwrap_or_default();
            let old_score = data.score;
            data.score = data.score.saturating_add(amount);
            data.reviews_completed = data.reviews_completed.saturating_add(1);
            self.scores.insert(account, &data);

            // Forward the attached POT to the reviewer
            let transferred = self.env().transferred_value();
            if transferred > 0 {
                self.env()
                    .transfer(account, transferred)
                    .map_err(|_| String::from("reward transfer failed"))?;
            }

            // reward always increases score; delta is non-negative
            let increased = data.score.saturating_sub(old_score);
            #[allow(clippy::cast_possible_wrap)]
            let delta: i128 = increased as i128;
            self.env().emit_event(ScoreChanged { account, delta });
            Ok(())
        }

        /// Return a page of reviewers sorted by score descending.
        #[ink(message)]
        pub fn get_leaderboard(&self, offset: u32, limit: u32) -> Vec<ReputationScore> {
            let mut all: Vec<ReputationScore> = (0..self.reviewer_count)
                .filter_map(|i| self.reviewers.get(i).map(|addr| self.build_reputation_score(addr)))
                .collect();

            all.sort_by(|a, b| b.score.cmp(&a.score));

            all.into_iter()
                .skip(offset as usize)
                .take(limit as usize)
                .collect()
        }

        /// Total number of registered reviewers.
        #[ink(message)]
        pub fn reviewer_count(&self) -> u32 {
            self.reviewer_count
        }
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        #[ink::test]
        fn unknown_account_returns_none() {
            let accounts = default_accounts();
            let contract = Reputation::new();
            assert!(contract.get_score(accounts.alice).is_none());
        }

        #[ink::test]
        fn reward_registers_and_increments() {
            let accounts = default_accounts();
            let mut contract = Reputation::new();

            // Admin is the contract deployer
            assert!(contract
                .reward(accounts.alice, String::from("job-1"), 500)
                .is_ok());

            let score = contract.get_score(accounts.alice).unwrap();
            assert_eq!(score.score, 500);
            assert_eq!(score.reviews_completed, 1);
            assert_eq!(score.tier, "Apprentice");
        }

        #[ink::test]
        fn slash_decrements_and_saturates() {
            let accounts = default_accounts();
            let mut contract = Reputation::new();

            contract
                .reward(accounts.alice, String::from("job-1"), 300)
                .unwrap();
            contract
                .slash(accounts.alice, String::from("job-1"), 100)
                .unwrap();

            let score = contract.get_score(accounts.alice).unwrap();
            assert_eq!(score.score, 200);
            assert_eq!(score.slash_count, 1);

            // Slash below zero saturates at 0
            contract
                .slash(accounts.alice, String::from("job-1"), 999_999)
                .unwrap();
            let score = contract.get_score(accounts.alice).unwrap();
            assert_eq!(score.score, 0);
        }

        #[ink::test]
        fn leaderboard_sorted_descending() {
            let accounts = default_accounts();
            let mut contract = Reputation::new();

            contract
                .reward(accounts.alice, String::from("j1"), 1_000)
                .unwrap();
            contract
                .reward(accounts.bob, String::from("j2"), 5_500)
                .unwrap();
            contract
                .reward(accounts.charlie, String::from("j3"), 300)
                .unwrap();

            let board = contract.get_leaderboard(0, 10);
            assert_eq!(board.len(), 3);
            assert_eq!(board[0].address, accounts.bob);   // 5_500
            assert_eq!(board[1].address, accounts.alice); // 1_000
            assert_eq!(board[2].address, accounts.charlie); // 300
        }

        #[ink::test]
        fn non_admin_cannot_slash_or_reward() {
            let accounts = default_accounts();
            let mut contract = Reputation::new();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert!(contract
                .reward(accounts.alice, String::from("j1"), 100)
                .is_err());
            assert!(contract
                .slash(accounts.alice, String::from("j1"), 100)
                .is_err());
        }
    }
}
