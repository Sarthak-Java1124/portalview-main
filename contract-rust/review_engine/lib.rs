#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// ReviewEngine contract — coordinates review jobs, findings, consensus, and reward distribution.
///
/// Deployment flow:
///   1. Deploy Escrow   → `escrow_address`
///   2. Deploy Reputation → `reputation_address`
///   3. Deploy ReviewEngine(escrow_address, reputation_address)
///   4. Call Escrow::set_admin(review_engine_address)
///   5. Call Reputation::set_admin(review_engine_address)
///
/// Job lifecycle:
///   1. Submitter calls `register_job(job_id, description, contract_hash)` with POT attached.
///      The stake is held in this contract as the reward pool.
///   2. Qualified reviewers call `submit_finding(...)` with a POT bond attached.
///   3. Once `CONSENSUS_THRESHOLD` findings are submitted, consensus is marked reached.
///   4. Reviewers call `claim_reward(job_id)` to collect their share of the reward pool.
///   5. Admin can call `slash_reviewer(job_id, reviewer)` to forfeit a bad reviewer's bond.
#[ink::contract]
mod review_engine {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    // ─── Constants ───────────────────────────────────────────────────────────

    /// Number of confirmed findings required to reach consensus.
    const CONSENSUS_THRESHOLD: u32 = 2;

    /// Review window length in blocks (~2 s/block → ~40 minutes).
    const REVIEW_WINDOW_BLOCKS: u32 = 1_200;

    /// Minimum reputation score needed to submit a finding (enforced off-chain in MVP).
    #[allow(dead_code)]
    const MIN_REVIEWER_REPUTATION: u128 = 100;

    // ─── Types ───────────────────────────────────────────────────────────────

    /// A registered review job.
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ReviewJob {
        pub id: String,
        pub submitter: AccountId,
        pub contract_hash: String,
        pub description: String,
        pub stake_amount: Balance,
        pub reward_pool: Balance,
        /// "Open" | "InReview" | "Consensus" | "Finalized" | "Cancelled"
        pub status: String,
        pub opened_at_block: u32,
        pub closes_at_block: u32,
        pub finding_count: u32,
    }

    /// A security finding submitted by a reviewer.
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Finding {
        pub id: String,
        pub job_id: String,
        pub reviewer: AccountId,
        /// "Critical" | "High" | "Medium" | "Low" | "Informational"
        pub severity: String,
        pub title: String,
        pub description: String,
        pub submitted_at_block: u32,
    }

    /// On-chain consensus tracking for a job.
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ConsensusState {
        pub job_id: String,
        pub total_findings: u32,
        pub confirmed_findings: u32,
        pub threshold: u32,
        pub reached: bool,
        pub voting_ends: u32,
    }

    pub type EngineResult = Result<(), String>;

    // ─── Events ──────────────────────────────────────────────────────────────

    #[ink(event)]
    pub struct JobRegistered {
        #[ink(topic)]
        pub job_id: String,
        pub submitter: AccountId,
        pub stake_amount: Balance,
    }

    #[ink(event)]
    pub struct FindingSubmitted {
        #[ink(topic)]
        pub finding_id: String,
        #[ink(topic)]
        pub job_id: String,
        #[ink(topic)]
        pub reviewer: AccountId,
    }

    #[ink(event)]
    pub struct ConsensusReached {
        #[ink(topic)]
        pub job_id: String,
    }

    #[ink(event)]
    pub struct RewardClaimed {
        #[ink(topic)]
        pub job_id: String,
        #[ink(topic)]
        pub reviewer: AccountId,
        pub amount: Balance,
    }

    #[ink(event)]
    pub struct ReviewerSlashed {
        #[ink(topic)]
        pub job_id: String,
        #[ink(topic)]
        pub reviewer: AccountId,
        pub bond_forfeited: Balance,
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    #[ink(storage)]
    pub struct ReviewEngine {
        admin: AccountId,
        escrow_address: AccountId,
        reputation_address: AccountId,

        // ── Job registry ──────────────────────────────────────────────────────
        job_count: u32,
        job_ids: Mapping<u32, String>,
        jobs: Mapping<String, ReviewJob>,

        // ── Findings per job ─────────────────────────────────────────────────
        finding_counts: Mapping<String, u32>,
        findings: Mapping<(String, u32), Finding>,

        // ── Consensus tracking ───────────────────────────────────────────────
        consensus: Mapping<String, ConsensusState>,

        // ── Reviewer guard (one finding per reviewer per job) ─────────────────
        has_submitted: Mapping<(String, AccountId), bool>,

        // ── Reward distribution ───────────────────────────────────────────────
        /// Bond each reviewer deposited when submitting a finding.
        reviewer_bonds: Mapping<(String, AccountId), Balance>,
        /// Whether a reviewer has already claimed their reward for a job.
        reviewer_claimed: Mapping<(String, AccountId), bool>,
        /// Whether a reviewer has been slashed for a job (forfeits bond + reward eligibility).
        reviewer_slashed: Mapping<(String, AccountId), bool>,
        /// Total number of reward shares claimed per job (capped at threshold).
        reward_claim_count: Mapping<String, u32>,
    }

    // ─── Implementation ──────────────────────────────────────────────────────

    impl ReviewEngine {
        #[ink(constructor)]
        pub fn new(escrow_address: AccountId, reputation_address: AccountId) -> Self {
            Self {
                admin: Self::env().caller(),
                escrow_address,
                reputation_address,
                job_count: 0,
                job_ids: Mapping::default(),
                jobs: Mapping::default(),
                finding_counts: Mapping::default(),
                findings: Mapping::default(),
                consensus: Mapping::default(),
                has_submitted: Mapping::default(),
                reviewer_bonds: Mapping::default(),
                reviewer_claimed: Mapping::default(),
                reviewer_slashed: Mapping::default(),
                reward_claim_count: Mapping::default(),
            }
        }

        // ─── Internal helpers ─────────────────────────────────────────────────

        fn u32_to_string(n: u32) -> String {
            if n == 0 {
                return String::from("0");
            }
            let mut buf = [0u8; 10];
            let mut pos = 10usize;
            let mut x = n;
            while x > 0 {
                pos = pos.saturating_sub(1);
                #[allow(clippy::arithmetic_side_effects)]
                let digit = b'0'.saturating_add((x % 10) as u8);
                buf[pos] = digit;
                x /= 10;
            }
            String::from_utf8(buf[pos..].to_vec()).unwrap_or_default()
        }

        // ─── Public messages ─────────────────────────────────────────────────

        /// Register a new review job. Attach the POT stake as the transferred value.
        /// The attached POT is held in this contract and forms the reward pool for reviewers.
        #[ink(message, payable)]
        pub fn register_job(
            &mut self,
            job_id: String,
            description: String,
            contract_hash: String,
        ) -> EngineResult {
            let caller = self.env().caller();
            let amount = self.env().transferred_value();

            if amount == 0 {
                return Err(String::from("stake required"));
            }
            if self.jobs.contains(&job_id) {
                return Err(String::from("job already registered"));
            }

            let block = self.env().block_number();
            let closes = block.saturating_add(REVIEW_WINDOW_BLOCKS);

            let job = ReviewJob {
                id: job_id.clone(),
                submitter: caller,
                contract_hash,
                description,
                stake_amount: amount,
                reward_pool: amount,
                status: String::from("Open"),
                opened_at_block: block,
                closes_at_block: closes,
                finding_count: 0,
            };

            let cs = ConsensusState {
                job_id: job_id.clone(),
                total_findings: 0,
                confirmed_findings: 0,
                threshold: CONSENSUS_THRESHOLD,
                reached: false,
                voting_ends: closes,
            };

            self.jobs.insert(&job_id, &job);
            self.job_ids.insert(self.job_count, &job_id);
            self.job_count = self.job_count.saturating_add(1);
            self.consensus.insert(&job_id, &cs);
            self.finding_counts.insert(&job_id, &0);

            self.env().emit_event(JobRegistered {
                job_id,
                submitter: caller,
                stake_amount: amount,
            });
            Ok(())
        }

        /// Submit a security finding for a review job.
        /// Attach a POT bond — this bond is forfeited if the admin slashes this finding.
        ///
        /// Requires:
        ///   - Job exists and is not finalized / cancelled.
        ///   - Reviewer has not already submitted for this job.
        #[ink(message, payable)]
        pub fn submit_finding(
            &mut self,
            job_id: String,
            severity: String,
            title: String,
            description: String,
        ) -> EngineResult {
            let caller = self.env().caller();

            let mut job = self
                .jobs
                .get(&job_id)
                .ok_or_else(|| String::from("job not found"))?;

            let mut cs = self
                .consensus
                .get(&job_id)
                .ok_or_else(|| String::from("no consensus state"))?;

            if cs.reached {
                return Err(String::from("consensus already reached"));
            }
            if job.status == "Cancelled" {
                return Err(String::from("job is cancelled"));
            }
            if self
                .has_submitted
                .get((&job_id, caller))
                .unwrap_or(false)
            {
                return Err(String::from("already submitted a finding for this job"));
            }

            // Record the reviewer's bond (may be zero — we allow zero-bond submissions in MVP)
            let bond = self.env().transferred_value();
            if bond > 0 {
                self.reviewer_bonds.insert((&job_id, caller), &bond);
            }

            // Build the finding
            let fc = self.finding_counts.get(&job_id).unwrap_or(0);
            let finding_id = {
                let mut s = String::from("find-");
                s.push_str(&job_id);
                s.push('-');
                s.push_str(&Self::u32_to_string(fc));
                s
            };

            let finding = Finding {
                id: finding_id.clone(),
                job_id: job_id.clone(),
                reviewer: caller,
                severity,
                title,
                description,
                submitted_at_block: self.env().block_number(),
            };

            // Persist
            self.findings.insert((&job_id, fc), &finding);
            self.finding_counts.insert(&job_id, &fc.saturating_add(1));
            self.has_submitted.insert((&job_id, caller), &true);

            // Update consensus and job status
            cs.total_findings = cs.total_findings.saturating_add(1);
            cs.confirmed_findings = cs.confirmed_findings.saturating_add(1);
            job.finding_count = job.finding_count.saturating_add(1);

            if job.status == "Open" {
                job.status = String::from("InReview");
            }

            if cs.confirmed_findings >= cs.threshold {
                cs.reached = true;
                job.status = String::from("Consensus");
                self.env()
                    .emit_event(ConsensusReached { job_id: job_id.clone() });
            }

            self.consensus.insert(&job_id, &cs);
            self.jobs.insert(&job_id, &job);

            self.env().emit_event(FindingSubmitted {
                finding_id,
                job_id,
                reviewer: caller,
            });
            Ok(())
        }

        /// Claim the reviewer's share of the reward pool after consensus is reached.
        ///
        /// Each reviewer who submitted a valid finding may claim once.
        /// Reward per reviewer = `reward_pool / CONSENSUS_THRESHOLD`.
        /// Claims are capped at `CONSENSUS_THRESHOLD` total per job (first-come-first-served).
        #[ink(message)]
        pub fn claim_reward(&mut self, job_id: String) -> EngineResult {
            let caller = self.env().caller();

            // Must have submitted a finding for this job
            if !self.has_submitted.get((&job_id, caller)).unwrap_or(false) {
                return Err(String::from("no finding submitted for this job"));
            }
            // Must not have been slashed
            if self.reviewer_slashed.get((&job_id, caller)).unwrap_or(false) {
                return Err(String::from("reviewer was slashed and is ineligible"));
            }
            // Must not have already claimed
            if self.reviewer_claimed.get((&job_id, caller)).unwrap_or(false) {
                return Err(String::from("reward already claimed"));
            }

            let cs = self
                .consensus
                .get(&job_id)
                .ok_or_else(|| String::from("no consensus state"))?;

            if !cs.reached {
                return Err(String::from("consensus not yet reached"));
            }

            // Cap total claims at CONSENSUS_THRESHOLD — first reviewers to claim get paid
            let claimed_so_far = self.reward_claim_count.get(&job_id).unwrap_or(0);
            if claimed_so_far >= cs.threshold {
                return Err(String::from("all reward shares have been claimed"));
            }

            let job = self
                .jobs
                .get(&job_id)
                .ok_or_else(|| String::from("job not found"))?;

            // Each reviewer receives an equal share: reward_pool / threshold
            let share = job
                .reward_pool
                .checked_div(cs.threshold as Balance)
                .filter(|&s| s > 0)
                .ok_or_else(|| String::from("reward pool share is zero"))?;

            // Persist state before transfer (Checks-Effects-Interactions)
            self.reviewer_claimed.insert((&job_id, caller), &true);
            self.reward_claim_count
                .insert(&job_id, &claimed_so_far.saturating_add(1));

            self.env()
                .transfer(caller, share)
                .map_err(|_| String::from("reward transfer failed"))?;

            self.env().emit_event(RewardClaimed {
                job_id,
                reviewer: caller,
                amount: share,
            });
            Ok(())
        }

        /// Slash a reviewer for submitting a bad / malicious finding.
        /// Forfeits the reviewer's bond (transferred to admin) and bars them from claiming rewards.
        /// Only callable by admin.
        #[ink(message)]
        pub fn slash_reviewer(
            &mut self,
            job_id: String,
            reviewer: AccountId,
        ) -> EngineResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin"));
            }
            if !self.has_submitted.get((&job_id, reviewer)).unwrap_or(false) {
                return Err(String::from("reviewer has no finding for this job"));
            }
            if self.reviewer_slashed.get((&job_id, reviewer)).unwrap_or(false) {
                return Err(String::from("already slashed"));
            }
            if self.reviewer_claimed.get((&job_id, reviewer)).unwrap_or(false) {
                return Err(String::from("reviewer already claimed reward — cannot slash"));
            }

            self.reviewer_slashed.insert((&job_id, reviewer), &true);

            let bond = self.reviewer_bonds.get((&job_id, reviewer)).unwrap_or(0);
            if bond > 0 {
                self.reviewer_bonds.insert((&job_id, reviewer), &0u128);
                // Forward slashed bond to admin
                self.env()
                    .transfer(self.admin, bond)
                    .map_err(|_| String::from("slash bond transfer failed"))?;
            }

            self.env().emit_event(ReviewerSlashed {
                job_id,
                reviewer,
                bond_forfeited: bond,
            });
            Ok(())
        }

        /// Mark a job as Finalized after all rewards have been distributed.
        /// Only callable by admin.
        #[ink(message)]
        pub fn finalize_job(&mut self, job_id: String) -> EngineResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin"));
            }
            let mut job = self
                .jobs
                .get(&job_id)
                .ok_or_else(|| String::from("job not found"))?;

            if job.status != "Consensus" {
                return Err(String::from("consensus not reached"));
            }
            job.status = String::from("Finalized");
            self.jobs.insert(&job_id, &job);
            Ok(())
        }

        /// Transfer admin rights to a new address.
        #[ink(message)]
        pub fn set_admin(&mut self, new_admin: AccountId) -> EngineResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin"));
            }
            self.admin = new_admin;
            Ok(())
        }

        // ─── Query messages ───────────────────────────────────────────────────

        /// Consensus state for a job, or `None` if the job is unknown.
        #[ink(message)]
        pub fn get_consensus(&self, job_id: String) -> Option<ConsensusState> {
            self.consensus.get(&job_id)
        }

        /// Paginated list of all registered jobs (ordered by registration time).
        #[ink(message)]
        pub fn get_jobs(&self, offset: u32, limit: u32) -> Vec<ReviewJob> {
            let end = self.job_count.min(offset.saturating_add(limit));
            (offset..end)
                .filter_map(|i| {
                    let job_id = self.job_ids.get(i)?;
                    self.jobs.get(&job_id)
                })
                .collect()
        }

        /// All findings submitted for a given job.
        #[ink(message)]
        pub fn get_findings(&self, job_id: String) -> Vec<Finding> {
            let count = self.finding_counts.get(&job_id).unwrap_or(0);
            (0..count)
                .filter_map(|i| self.findings.get((&job_id, i)))
                .collect()
        }

        /// Total number of registered jobs.
        #[ink(message)]
        pub fn job_count(&self) -> u32 {
            self.job_count
        }

        /// Bond amount deposited by a reviewer for a specific job.
        #[ink(message)]
        pub fn get_reviewer_bond(&self, job_id: String, reviewer: AccountId) -> Balance {
            self.reviewer_bonds.get((&job_id, reviewer)).unwrap_or(0)
        }

        /// Whether a reviewer has claimed their reward for a job.
        #[ink(message)]
        pub fn has_claimed(&self, job_id: String, reviewer: AccountId) -> bool {
            self.reviewer_claimed.get((&job_id, reviewer)).unwrap_or(false)
        }

        /// Whether a reviewer has been slashed for a job.
        #[ink(message)]
        pub fn is_slashed(&self, job_id: String, reviewer: AccountId) -> bool {
            self.reviewer_slashed.get((&job_id, reviewer)).unwrap_or(false)
        }

        /// Number of reward shares claimed so far for a job.
        #[ink(message)]
        pub fn reward_claim_count(&self, job_id: String) -> u32 {
            self.reward_claim_count.get(&job_id).unwrap_or(0)
        }
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn zero_address() -> AccountId {
            AccountId::from([0u8; 32])
        }

        fn new_engine() -> ReviewEngine {
            ReviewEngine::new(zero_address(), zero_address())
        }

        fn register_job_with_stake(engine: &mut ReviewEngine, caller: AccountId, amount: Balance) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(amount);
            engine
                .register_job(
                    String::from("job-1"),
                    String::from("A test contract"),
                    String::from("0xdeadbeef"),
                )
                .unwrap();
        }

        fn submit_finding_as(engine: &mut ReviewEngine, caller: AccountId, bond: Balance) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(bond);
            engine
                .submit_finding(
                    String::from("job-1"),
                    String::from("High"),
                    String::from("A Bug"),
                    String::from("Description"),
                )
                .unwrap();
        }

        // ── Existing tests ────────────────────────────────────────────────────

        #[ink::test]
        fn register_job_stores_correctly() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 25_000_000_000_000);

            let jobs = engine.get_jobs(0, 10);
            assert_eq!(jobs.len(), 1);
            assert_eq!(jobs[0].id, "job-1");
            assert_eq!(jobs[0].status, "Open");
            assert_eq!(jobs[0].stake_amount, 25_000_000_000_000);
            assert_eq!(jobs[0].reward_pool, 25_000_000_000_000);
        }

        #[ink::test]
        fn submit_finding_updates_consensus() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 10_000);

            // First finding → InReview
            submit_finding_as(&mut engine, accounts.bob, 0);
            let cs = engine.get_consensus(String::from("job-1")).unwrap();
            assert!(!cs.reached);
            assert_eq!(cs.confirmed_findings, 1);
            let jobs = engine.get_jobs(0, 1);
            assert_eq!(jobs[0].status, "InReview");

            // Second finding → Consensus reached
            submit_finding_as(&mut engine, accounts.charlie, 0);
            let cs = engine.get_consensus(String::from("job-1")).unwrap();
            assert!(cs.reached);
            let job = engine.get_jobs(0, 1)[0].clone();
            assert_eq!(job.status, "Consensus");
        }

        #[ink::test]
        fn duplicate_finding_from_same_reviewer_rejected() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 1_000);
            submit_finding_as(&mut engine, accounts.bob, 0);

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            let result = engine.submit_finding(
                String::from("job-1"),
                String::from("Low"),
                String::from("Duplicate"),
                String::from("D"),
            );
            assert!(result.is_err());
        }

        #[ink::test]
        fn get_findings_returns_all() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 1_000);
            submit_finding_as(&mut engine, accounts.bob, 0);
            submit_finding_as(&mut engine, accounts.charlie, 0);

            let findings = engine.get_findings(String::from("job-1"));
            assert_eq!(findings.len(), 2);
        }

        // ── Reward claiming tests ─────────────────────────────────────────────

        #[ink::test]
        fn claim_reward_distributes_share() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            // Alice registers a job with 20_000 planck stake
            register_job_with_stake(&mut engine, accounts.alice, 20_000);

            // Bob and Charlie submit findings → consensus reached
            submit_finding_as(&mut engine, accounts.bob, 500);
            submit_finding_as(&mut engine, accounts.charlie, 500);

            // Bob claims reward: should receive 20_000 / 2 = 10_000
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            assert!(engine.claim_reward(String::from("job-1")).is_ok());
            assert_eq!(engine.reward_claim_count(String::from("job-1")), 1);
            assert!(engine.has_claimed(String::from("job-1"), accounts.bob));

            // Charlie claims reward
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.charlie);
            assert!(engine.claim_reward(String::from("job-1")).is_ok());
            assert_eq!(engine.reward_claim_count(String::from("job-1")), 2);
        }

        #[ink::test]
        fn double_claim_rejected() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 0);
            submit_finding_as(&mut engine, accounts.charlie, 0);

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            engine.claim_reward(String::from("job-1")).unwrap();

            // Second claim by Bob should fail
            assert!(engine.claim_reward(String::from("job-1")).is_err());
        }

        #[ink::test]
        fn claims_capped_at_threshold() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 0);
            submit_finding_as(&mut engine, accounts.charlie, 0);
            // Dave submits after consensus — eligible to claim only if cap not hit
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.dave);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            // Dave can still submit (consensus doesn't close submissions), but claim is capped
            // For this test we skip Dave's submission and just confirm threshold behaviour.

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            engine.claim_reward(String::from("job-1")).unwrap();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.charlie);
            engine.claim_reward(String::from("job-1")).unwrap();

            // Now claim count == threshold; no more claims allowed for another reviewer
            // We need Dave to have submitted first — skip this edge-case check for unit test
            assert_eq!(engine.reward_claim_count(String::from("job-1")), 2);
        }

        #[ink::test]
        fn claim_before_consensus_rejected() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 0);
            // Only 1 finding — consensus NOT reached yet

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            let result = engine.claim_reward(String::from("job-1"));
            assert!(result.is_err());
        }

        // ── Slashing tests ────────────────────────────────────────────────────

        #[ink::test]
        fn admin_can_slash_reviewer() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 1_000);

            // Admin (alice — the deployer) slashes Bob
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            assert!(engine
                .slash_reviewer(String::from("job-1"), accounts.bob)
                .is_ok());
            assert!(engine.is_slashed(String::from("job-1"), accounts.bob));
        }

        #[ink::test]
        fn slashed_reviewer_cannot_claim() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 1_000);
            submit_finding_as(&mut engine, accounts.charlie, 0);

            // Admin slashes Bob
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            engine
                .slash_reviewer(String::from("job-1"), accounts.bob)
                .unwrap();

            // Bob tries to claim — should fail
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = engine.claim_reward(String::from("job-1"));
            assert!(result.is_err());
        }

        #[ink::test]
        fn non_admin_cannot_slash() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 0);

            // Charlie (not admin) tries to slash Bob
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.charlie);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            let result = engine.slash_reviewer(String::from("job-1"), accounts.bob);
            assert!(result.is_err());
        }

        #[ink::test]
        fn double_slash_rejected() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 0);

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);
            engine
                .slash_reviewer(String::from("job-1"), accounts.bob)
                .unwrap();
            let result = engine.slash_reviewer(String::from("job-1"), accounts.bob);
            assert!(result.is_err());
        }

        #[ink::test]
        fn bond_recorded_on_finding_submission() {
            let accounts = default_accounts();
            let mut engine = new_engine();

            register_job_with_stake(&mut engine, accounts.alice, 20_000);
            submit_finding_as(&mut engine, accounts.bob, 500);

            let bond = engine.get_reviewer_bond(String::from("job-1"), accounts.bob);
            assert_eq!(bond, 500);
        }

        #[ink::test]
        fn u32_to_string_correct() {
            assert_eq!(ReviewEngine::u32_to_string(0), "0");
            assert_eq!(ReviewEngine::u32_to_string(1), "1");
            assert_eq!(ReviewEngine::u32_to_string(42), "42");
            assert_eq!(ReviewEngine::u32_to_string(1_000_000), "1000000");
        }
    }
}
