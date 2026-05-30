#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Escrow contract — holds POT staked by review-job submitters.
///
/// Flow:
///   1. Submitter calls `stake(job_id, description)` with attached POT.
///   2. Funds are locked until consensus is reached or the job is cancelled.
///   3. Admin (ReviewEngine) calls `release` to return stake to the submitter,
///      or the submitter calls `cancel` to retrieve their stake before review.
#[ink::contract]
mod escrow {
    use ink::prelude::string::String;
    use ink::storage::Mapping;

    // ─── Types ───────────────────────────────────────────────────────────────

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum EscrowStatus {
        None,
        Staked,
        Released,
        Cancelled,
    }

    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct EscrowState {
        pub job_id: String,
        pub submitter: AccountId,
        pub amount: Balance,
        pub status: EscrowStatus,
        pub opened_at_block: u32,
    }

    /// Every mutable message returns this on failure.
    pub type EscrowResult = Result<(), String>;

    // ─── Events ──────────────────────────────────────────────────────────────

    #[ink(event)]
    pub struct Staked {
        #[ink(topic)]
        pub job_id: String,
        #[ink(topic)]
        pub submitter: AccountId,
        pub amount: Balance,
    }

    #[ink(event)]
    pub struct Released {
        #[ink(topic)]
        pub job_id: String,
    }

    #[ink(event)]
    pub struct Cancelled {
        #[ink(topic)]
        pub job_id: String,
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    #[ink(storage)]
    pub struct Escrow {
        /// Deployer — allowed to call `release`.
        admin: AccountId,
        /// job_id → escrow record.
        jobs: Mapping<String, EscrowState>,
        /// Sequential index → job_id (for future pagination / indexing).
        job_ids: Mapping<u32, String>,
        job_count: u32,
    }

    // ─── Implementation ──────────────────────────────────────────────────────

    impl Default for Escrow {
        fn default() -> Self {
            Self::new()
        }
    }

    impl Escrow {
        /// Instantiate the Escrow contract.
        /// The caller becomes the admin (typically the ReviewEngine contract address
        /// after deployment, updated via `set_admin`).
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                admin: Self::env().caller(),
                jobs: Mapping::default(),
                job_ids: Mapping::default(),
                job_count: 0,
            }
        }

        /// Transfer admin rights (e.g. to the ReviewEngine contract after deployment).
        #[ink(message)]
        pub fn set_admin(&mut self, new_admin: AccountId) -> EscrowResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin"));
            }
            self.admin = new_admin;
            Ok(())
        }

        /// Lock POT tokens and open a review job.
        /// The transferred value becomes the stake that reviewers compete for.
        #[ink(message, payable)]
        pub fn stake(&mut self, job_id: String, _description: String) -> EscrowResult {
            let caller = self.env().caller();
            let amount = self.env().transferred_value();

            if amount == 0 {
                return Err(String::from("stake must be greater than zero"));
            }
            if self.jobs.contains(&job_id) {
                return Err(String::from("job already exists"));
            }

            let state = EscrowState {
                job_id: job_id.clone(),
                submitter: caller,
                amount,
                status: EscrowStatus::Staked,
                opened_at_block: self.env().block_number(),
            };

            self.jobs.insert(&job_id, &state);
            self.job_ids.insert(self.job_count, &job_id);
            self.job_count = self.job_count.saturating_add(1);

            self.env().emit_event(Staked {
                job_id,
                submitter: caller,
                amount,
            });
            Ok(())
        }

        /// Return the staked amount to the submitter after consensus is confirmed.
        /// Only callable by admin (ReviewEngine contract).
        #[ink(message)]
        pub fn release(&mut self, job_id: String) -> EscrowResult {
            if self.env().caller() != self.admin {
                return Err(String::from("only admin can release"));
            }

            let mut state = self
                .jobs
                .get(&job_id)
                .ok_or_else(|| String::from("job not found"))?;

            if state.status != EscrowStatus::Staked {
                return Err(String::from("job is not in Staked status"));
            }

            let (recipient, amount) = (state.submitter, state.amount);
            state.status = EscrowStatus::Released;
            self.jobs.insert(&job_id, &state);

            self.env()
                .transfer(recipient, amount)
                .map_err(|_| String::from("transfer failed"))?;

            self.env().emit_event(Released { job_id });
            Ok(())
        }

        /// Cancel the job and refund the submitter.
        /// Callable by the original submitter (before review starts) or admin.
        #[ink(message)]
        pub fn cancel(&mut self, job_id: String) -> EscrowResult {
            let caller = self.env().caller();

            let mut state = self
                .jobs
                .get(&job_id)
                .ok_or_else(|| String::from("job not found"))?;

            if caller != state.submitter && caller != self.admin {
                return Err(String::from("not authorised"));
            }
            if state.status != EscrowStatus::Staked {
                return Err(String::from("job is not in Staked status"));
            }

            let (recipient, amount) = (state.submitter, state.amount);
            state.status = EscrowStatus::Cancelled;
            self.jobs.insert(&job_id, &state);

            self.env()
                .transfer(recipient, amount)
                .map_err(|_| String::from("transfer failed"))?;

            self.env().emit_event(Cancelled { job_id });
            Ok(())
        }

        /// Query the escrow record for a job. Returns `None` if the job does not exist.
        #[ink(message)]
        pub fn get_state(&self, job_id: String) -> Option<EscrowState> {
            self.jobs.get(&job_id)
        }

        /// Total number of jobs ever created (monotonically increasing).
        #[ink(message)]
        pub fn job_count(&self) -> u32 {
            self.job_count
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
        fn stake_records_state() {
            let accounts = default_accounts();
            let mut contract = Escrow::new();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(
                10_000_000_000_000,
            );

            assert!(contract
                .stake(String::from("job-1"), String::from("test contract"))
                .is_ok());

            let state = contract.get_state(String::from("job-1")).unwrap();
            assert_eq!(state.status, EscrowStatus::Staked);
            assert_eq!(state.submitter, accounts.alice);
            assert_eq!(state.amount, 10_000_000_000_000);
        }

        #[ink::test]
        fn duplicate_job_id_rejected() {
            let accounts = default_accounts();
            let mut contract = Escrow::new();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000);

            contract
                .stake(String::from("job-1"), String::from("first"))
                .unwrap();

            let result = contract.stake(String::from("job-1"), String::from("duplicate"));
            assert!(result.is_err());
        }

        #[ink::test]
        fn zero_stake_rejected() {
            let accounts = default_accounts();
            let mut contract = Escrow::new();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(0);

            let result = contract.stake(String::from("job-1"), String::from("test"));
            assert!(result.is_err());
        }

        #[ink::test]
        fn only_submitter_or_admin_can_cancel() {
            let accounts = default_accounts();
            let mut contract = Escrow::new();

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000);
            contract
                .stake(String::from("job-1"), String::from("test"))
                .unwrap();

            // Bob cannot cancel Alice's job
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = contract.cancel(String::from("job-1"));
            assert!(result.is_err());
        }
    }
}
