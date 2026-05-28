import type { ReviewJob, Finding, ConsensusState } from "@/types/review.types";
import type { ReputationScore } from "@/types/reputation.types";
import type { EscrowState, EscrowStatus } from "@/types/staking.types";

const POT = 1_000_000_000_000n;

// ─── Addresses ────────────────────────────────────────────────────────────

export const ADDR = {
  alice:   "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  bob:     "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  charlie: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
  dave:    "5DAAnrj7yHTM5eqhezRqoFC5BCCnh1onom5bLNiVBVeiqBdw",
  eve:     "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
  ferdie:  "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL",
  r7:      "5C4hrfjw8HDHMGhEsWxqGjyJKJbHp2Au92CbdS6ddmMHMvAH",
  r8:      "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY",
  r9:      "5HpG9w8EJCPbhRHNRKoNa6zDH2U5HL8NNmBmaJdUqfGGWfam",
  r10:     "5Ck5SLSHYac6WFt5UZRSejufEtTdhGtfdnPGuf1yre1oqe6X",
  r11:     "5DyMkqaAM5WVnT9MmBdFJpGBNT4zW4GQYS1pFrRvkWxpCFHU",
  r12:     "5E4oQ48rGPGxaD5C5FkfQn5sDYXMGJPnbdXFVTCHvnYWxoZ1",
  r13:     "5F3sa2TJaYahg8SkgMMRx3tnNK2SHm2eMrjWqpJj9Qn6RZwC",
  r14:     "5CRmqmCvNRGMLsPB3gkfBmNgJmTiCJRV9AEP9kBNFeBVAXD1",
  r15:     "5Gyw4FfMKJLnMkHvKxCjVAfYHVpXWbxRbRYgqmJxhZKFaJr5",
} as const;

// ─── Leaderboard ──────────────────────────────────────────────────────────

export const MOCK_LEADERBOARD: ReputationScore[] = [
  { address: ADDR.alice,   score: 12_450n, tier: "Legend",     reviewsCompleted: 89, slashCount: 1 },
  { address: ADDR.bob,     score:  7_832n, tier: "Expert",     reviewsCompleted: 54, slashCount: 2 },
  { address: ADDR.charlie, score:  5_101n, tier: "Expert",     reviewsCompleted: 41, slashCount: 0 },
  { address: ADDR.dave,    score:  3_890n, tier: "Senior",     reviewsCompleted: 28, slashCount: 3 },
  { address: ADDR.eve,     score:  2_750n, tier: "Senior",     reviewsCompleted: 22, slashCount: 1 },
  { address: ADDR.ferdie,  score:  2_340n, tier: "Senior",     reviewsCompleted: 18, slashCount: 2 },
  { address: ADDR.r7,      score:  1_654n, tier: "Journeyman", reviewsCompleted: 14, slashCount: 0 },
  { address: ADDR.r8,      score:  1_102n, tier: "Journeyman", reviewsCompleted: 10, slashCount: 4 },
  { address: ADDR.r9,      score:    820n, tier: "Apprentice", reviewsCompleted:  7, slashCount: 1 },
  { address: ADDR.r10,     score:    495n, tier: "Apprentice", reviewsCompleted:  4, slashCount: 0 },
  { address: ADDR.r11,     score:    310n, tier: "Apprentice", reviewsCompleted:  3, slashCount: 1 },
  { address: ADDR.r12,     score:    190n, tier: "Novice",     reviewsCompleted:  2, slashCount: 0 },
  { address: ADDR.r13,     score:    124n, tier: "Novice",     reviewsCompleted:  1, slashCount: 0 },
  { address: ADDR.r14,     score:     85n, tier: "Novice",     reviewsCompleted:  1, slashCount: 1 },
  { address: ADDR.r15,     score:     12n, tier: "Novice",     reviewsCompleted:  0, slashCount: 0 },
];

// ─── Seed Data ────────────────────────────────────────────────────────────

const SEED_JOBS: ReviewJob[] = [
  {
    id: "job-dex-amm-v2",
    submitter: ADDR.r12,
    contractHash: "0xa3f2b841c9e7d056f4b3a8e9c2d7f1b4e6a0c3d5f8b2e4a7c9d1f3b5e7a9c2d4",
    githubUrl: "https://github.com/use-ink/ink-examples",
    description: "DEX AMM V2 — concentrated liquidity pool implementation. Focus on reentrancy in swap(), price manipulation via flash loans, and precision loss in tick math.",
    stakeAmount: 25n * POT,
    rewardPool: 25n * POT,
    status: "Open",
    openedAtBlock: 1_247_500,
    closesAtBlock: 1_248_700,
    findingCount: 5,
  },
  {
    id: "job-nft-marketplace",
    submitter: ADDR.r11,
    contractHash: "0xb4e3c952d0f8e167a5c4b9d0e3f2a1b5c7e9f0d2a4c6e8b1d3f5a7c9e1b3d5f7",
    githubUrl: "https://github.com/paritytech/ink/tree/master/examples/erc721",
    description: "NFT marketplace with lazy minting and royalties. Review the bid escrow logic, royalty distribution edge cases, and access control on admin functions.",
    stakeAmount: 50n * POT,
    rewardPool: 50n * POT,
    status: "Open",
    openedAtBlock: 1_247_200,
    closesAtBlock: 1_248_400,
    findingCount: 2,
  },
  {
    id: "job-governance-v1",
    submitter: ADDR.r10,
    contractHash: "0xc5f4d063e1a9f278b6d5c0f1e4a3b2c6d8f0e2a4c6e8b0d2f4a6c8e0b2d4f6a8",
    description: "On-chain governance with timelock. Proposal creation, quorum calculation, and the execution delay. Special interest in vote-counting overflow and early execution attacks.",
    stakeAmount: 15n * POT,
    rewardPool: 15n * POT,
    status: "Open",
    openedAtBlock: 1_247_600,
    closesAtBlock: 1_248_800,
    findingCount: 0,
  },
  {
    id: "job-stablecoin-vault",
    submitter: ADDR.r9,
    contractHash: "0xd6a5e174f2b0a389c7e6d1a2f5b4c3d7e9f1a3c5e7a9c1e3a5c7e9f1a3c5e7f9",
    description: "Overcollateralised stablecoin vault with liquidation. Critical: oracle manipulation, liquidation bonus DoS, and collateral ratio rounding in favour of the protocol.",
    stakeAmount: 100n * POT,
    rewardPool: 100n * POT,
    status: "Consensus",
    openedAtBlock: 1_247_100,
    closesAtBlock: 1_248_300,
    findingCount: 7,
  },
  {
    id: "job-multisig-wallet",
    submitter: ADDR.r8,
    contractHash: "0xe7b6f285a3c1b490d8f7e2b3a6c5d4e8f0b2d4a6c8e0f2a4c6e8f0a2c4e6f8b0",
    description: "2-of-N multisig wallet with time-delayed execution. Review signature validation, nonce handling, and the upgrade mechanism. Focus on signature replay across chains.",
    stakeAmount: 30n * POT,
    rewardPool: 30n * POT,
    status: "InReview",
    openedAtBlock: 1_246_800,
    closesAtBlock: 1_248_000,
    findingCount: 3,
  },
  {
    id: "job-token-bridge",
    submitter: ADDR.r7,
    contractHash: "0xf8c7a396b4d2c501e9a8f3c4b7d6e5f9a0c2e4a6c8e0f2b4d6f8a0b2d4f6a8c0",
    description: "Cross-chain token bridge using merkle proofs. Priority: double-spend via merkle proof reuse, validator set update griefing, and stuck funds from failed cross-chain messages.",
    stakeAmount: 75n * POT,
    rewardPool: 75n * POT,
    status: "InReview",
    openedAtBlock: 1_246_500,
    closesAtBlock: 1_247_700,
    findingCount: 8,
  },
  {
    id: "job-lending-protocol",
    submitter: ADDR.ferdie,
    contractHash: "0xa1d2e3f4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
    description: "Lending protocol with variable interest rates. Consensus reached on 4 findings. Review completed — rewards distributed to participating reviewers.",
    stakeAmount: 40n * POT,
    rewardPool: 40n * POT,
    status: "Consensus",
    openedAtBlock: 1_245_000,
    closesAtBlock: 1_246_200,
    findingCount: 4,
  },
  {
    id: "job-yield-aggregator",
    submitter: ADDR.eve,
    contractHash: "0xb2e3f4a5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3",
    description: "Yield aggregator routing funds across three lending pools. Consensus reached on withdrawal sequencing vulnerability and fee-on-transfer token edge case.",
    stakeAmount: 20n * POT,
    rewardPool: 20n * POT,
    status: "Consensus",
    openedAtBlock: 1_244_500,
    closesAtBlock: 1_245_700,
    findingCount: 2,
  },
  {
    id: "job-erc20-simple",
    submitter: ADDR.dave,
    contractHash: "0xc3f4a5b6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4",
    description: "Standard PSP22 token with permit functionality. One confirmed finding: unchecked arithmetic in _mint() when totalSupply approaches u128::MAX.",
    stakeAmount: 10n * POT,
    rewardPool: 10n * POT,
    status: "Finalized",
    openedAtBlock: 1_240_000,
    closesAtBlock: 1_241_200,
    findingCount: 1,
  },
  {
    id: "job-oracle-feed",
    submitter: ADDR.charlie,
    contractHash: "0xd4a5b6c7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
    description: "Off-chain oracle feed aggregator. Cancelled by submitter — moved to a different review platform.",
    stakeAmount: 5n * POT,
    rewardPool: 5n * POT,
    status: "Cancelled",
    openedAtBlock: 1_238_000,
    closesAtBlock: 1_239_200,
    findingCount: 0,
  },
];

const SEED_FINDINGS: Finding[] = [
  // DEX AMM
  { id: "find-dex-001", jobId: "job-dex-amm-v2", reviewer: ADDR.alice, severity: "Critical", title: "Reentrancy in swap() via before_swap hook", description: "The swap() function calls an external before_swap hook before updating internal reserves. An attacker can reenter swap() during this call to drain the pool at the pre-update price.", lineStart: 142, lineEnd: 158, submittedAtBlock: 1_247_510 },
  { id: "find-dex-002", jobId: "job-dex-amm-v2", reviewer: ADDR.bob, severity: "High", title: "Flash loan price manipulation in get_spot_price()", description: "get_spot_price() reads current reserves directly without a TWAP window. A flash loan can skew the reported price by 40–60× within a single block, enabling profitable oracle attacks on dependent contracts.", lineStart: 89, lineEnd: 97, submittedAtBlock: 1_247_530 },
  { id: "find-dex-003", jobId: "job-dex-amm-v2", reviewer: ADDR.charlie, severity: "High", title: "Precision loss in tick_to_sqrt_price() causes incorrect liquidity", description: "Fixed-point arithmetic in tick_to_sqrt_price() truncates rather than rounding up, causing up to 0.01% liquidity to be permanently locked in out-of-range positions. Exploitable at scale.", lineStart: 203, lineEnd: 217, submittedAtBlock: 1_247_550 },
  { id: "find-dex-004", jobId: "job-dex-amm-v2", reviewer: ADDR.dave, severity: "Medium", title: "Missing deadline check allows front-running of large swaps", description: "swap() does not accept a deadline parameter. Miners can hold transactions in the mempool and execute them when pool conditions are unfavourable, extracting MEV.", submittedAtBlock: 1_247_560 },
  { id: "find-dex-005", jobId: "job-dex-amm-v2", reviewer: ADDR.eve, severity: "Low", title: "emit_swap_event missing position_id for partial fills", description: "Partial position fills emit an event without the position_id, making off-chain indexing unreliable for UIs tracking per-position fill history.", lineStart: 189, lineEnd: 190, submittedAtBlock: 1_247_580 },
  // NFT Marketplace
  { id: "find-nft-001", jobId: "job-nft-marketplace", reviewer: ADDR.alice, severity: "Critical", title: "Bid escrow funds permanently locked on cancelled auction", description: "When an auction is cancelled by the seller, bid.withdraw() is never called for the highest bidder. Their escrowed funds are permanently locked with no rescue function.", lineStart: 312, lineEnd: 328, submittedAtBlock: 1_247_210 },
  { id: "find-nft-002", jobId: "job-nft-marketplace", reviewer: ADDR.bob, severity: "Medium", title: "Royalty recipient can be set to zero address post-mint", description: "set_royalty_recipient() has no zero-address guard. If called with the zero address, royalty payments silently burn tokens on every secondary sale.", lineStart: 78, lineEnd: 82, submittedAtBlock: 1_247_240 },
  // Multisig Wallet
  { id: "find-ms-001", jobId: "job-multisig-wallet", reviewer: ADDR.alice, severity: "Critical", title: "Signature replay attack across parachains with same chain ID", description: "The signed message hash does not include the parachain ID or genesis hash. Transactions signed for one network can be replayed on a sibling parachain running the same contract code.", lineStart: 55, lineEnd: 71, submittedAtBlock: 1_246_820 },
  { id: "find-ms-002", jobId: "job-multisig-wallet", reviewer: ADDR.bob, severity: "High", title: "Nonce not incremented on failed execution allows replay", description: "If execute_tx() reverts due to a failed sub-call, the nonce is not incremented. Any owner can resubmit the same signed transaction bundle, bypassing the intent of a one-shot execution model.", lineStart: 134, lineEnd: 150, submittedAtBlock: 1_246_850 },
  { id: "find-ms-003", jobId: "job-multisig-wallet", reviewer: ADDR.charlie, severity: "Informational", title: "No event emitted on signer set change", description: "add_signer() and remove_signer() do not emit events. Off-chain monitoring tools cannot detect signer set changes without polling storage.", submittedAtBlock: 1_246_870 },
  // Token Bridge
  { id: "find-bridge-001", jobId: "job-token-bridge", reviewer: ADDR.alice, severity: "Critical", title: "Merkle proof replay: same proof accepted multiple times", description: "The is_claimed bitmap is indexed by leaf_index mod 256, wrapping after 256 claims. A proof for leaf 0 can be reused as proof for leaf 256, leaf 512, etc., enabling double-spend of any bridged asset.", lineStart: 201, lineEnd: 215, submittedAtBlock: 1_246_530 },
  { id: "find-bridge-002", jobId: "job-token-bridge", reviewer: ADDR.bob, severity: "Critical", title: "Validator set update permanently blocked by single dissenter", description: "update_validators() requires all current validators to sign. A single validator refusing to sign permanently blocks rotation, allowing them to hold the protocol hostage.", lineStart: 89, lineEnd: 112, submittedAtBlock: 1_246_560 },
  { id: "find-bridge-003", jobId: "job-token-bridge", reviewer: ADDR.charlie, severity: "High", title: "Stuck funds on failed cross-chain message with no retry path", description: "When relay() fails due to insufficient gas on the destination, tokens are burned on source but not minted on destination. No retry or refund path exists, permanently destroying bridged assets.", lineStart: 178, lineEnd: 195, submittedAtBlock: 1_246_590 },
  { id: "find-bridge-004", jobId: "job-token-bridge", reviewer: ADDR.dave, severity: "High", title: "No slippage protection on cross-chain swap path", description: "Bridge swaps use spot price at execution time on the destination chain. Large bridges can be front-run with sandwich attacks, extracting value from users expecting a fixed rate.", submittedAtBlock: 1_246_610 },
  { id: "find-bridge-005", jobId: "job-token-bridge", reviewer: ADDR.eve, severity: "Medium", title: "Fee calculation truncates to zero below minimum transfer threshold", description: "bridge_fee() rounds down to zero for transfers below 1000 tokens due to integer division. Fee-free bridging of many small amounts drains the relayer reward pool.", lineStart: 44, lineEnd: 48, submittedAtBlock: 1_246_630 },
  { id: "find-bridge-006", jobId: "job-token-bridge", reviewer: ADDR.ferdie, severity: "Low", title: "Event emitted before state update violates Checks-Effects-Interactions", description: "Bridged event fires before token balance is updated. Listening contracts acting on the event see stale balances, potentially causing incorrect downstream calculations.", lineStart: 163, lineEnd: 165, submittedAtBlock: 1_246_650 },
  { id: "find-bridge-007", jobId: "job-token-bridge", reviewer: ADDR.r7, severity: "Informational", title: "Hardcoded gas limit will break on future runtime upgrades", description: "gas_limit: 5_000_000_000 is hardcoded. A runtime upgrade changing gas pricing will cause all bridge calls to fail without a contract upgrade.", submittedAtBlock: 1_246_670 },
  { id: "find-bridge-008", jobId: "job-token-bridge", reviewer: ADDR.r8, severity: "Informational", title: "Missing ink! doc comments on public interface", description: "Public messages lack doc comments, making it difficult for integrators to understand expected inputs/outputs without reading source code.", submittedAtBlock: 1_246_690 },
  // Lending Protocol (Consensus)
  { id: "find-lend-001", jobId: "job-lending-protocol", reviewer: ADDR.alice, severity: "Critical", title: "Flash loan attack via same-block borrow-liquidate cycle", description: "An attacker can borrow, manipulate oracle price in the same block, trigger their own liquidation at an inflated collateral price, and repay with profit. No same-block borrow guard exists.", lineStart: 289, lineEnd: 305, submittedAtBlock: 1_245_100 },
  { id: "find-lend-002", jobId: "job-lending-protocol", reviewer: ADDR.bob, severity: "High", title: "Interest accrual skipped when utilisation rate is 100%", description: "accrue_interest() exits early when all funds are borrowed, freezing interest accumulation. Borrowers at 100% utilisation pay zero interest indefinitely.", lineStart: 167, lineEnd: 173, submittedAtBlock: 1_245_130 },
  { id: "find-lend-003", jobId: "job-lending-protocol", reviewer: ADDR.charlie, severity: "Medium", title: "Liquidation bonus creates bad debt on illiquid collateral", description: "The 10% liquidation bonus is paid from the protocol reserve even when collateral cannot be sold at the assumed price. Repeated liquidations drain the reserve to zero.", submittedAtBlock: 1_245_160 },
  { id: "find-lend-004", jobId: "job-lending-protocol", reviewer: ADDR.dave, severity: "Low", title: "Missing event on reserve factor update", description: "set_reserve_factor() updates state but emits no event, making governance fee changes invisible to on-chain monitoring.", submittedAtBlock: 1_245_190 },
  // Yield Aggregator (Consensus)
  { id: "find-yield-001", jobId: "job-yield-aggregator", reviewer: ADDR.alice, severity: "High", title: "Withdrawal ordering enables last-out griefing attack", description: "withdraw() processes pools in a fixed order. An attacker can front-run with a large deposit-then-withdrawal from pool 0, causing subsequent withdrawals to fail with InsufficientFunds.", lineStart: 201, lineEnd: 218, submittedAtBlock: 1_244_600 },
  { id: "find-yield-002", jobId: "job-yield-aggregator", reviewer: ADDR.bob, severity: "Medium", title: "Fee-on-transfer tokens inflate internal accounting", description: "deposit() credits the full transfer amount without measuring actual received tokens. Fee-on-transfer tokens cause total_assets() to overstate holdings, making share price calculation incorrect.", lineStart: 88, lineEnd: 96, submittedAtBlock: 1_244_630 },
  // Simple ERC20 (Finalized)
  { id: "find-erc20-001", jobId: "job-erc20-simple", reviewer: ADDR.alice, severity: "High", title: "Unchecked arithmetic in _mint() silently overflows at u128::MAX", description: "total_supply = total_supply + amount is not overflow-checked. Minting to a total supply near u128::MAX silently wraps, permanently corrupting all balances.", lineStart: 45, lineEnd: 46, submittedAtBlock: 1_240_100 },
];

const SEED_CONSENSUS: Record<string, ConsensusState> = {
  "job-dex-amm-v2":       { jobId: "job-dex-amm-v2",       totalFindings: 5, confirmedFindings: 3, threshold: 2, reached: false, votingEnds: 1_248_700 },
  "job-nft-marketplace":  { jobId: "job-nft-marketplace",   totalFindings: 2, confirmedFindings: 1, threshold: 2, reached: false, votingEnds: 1_248_400 },
  "job-governance-v1":    { jobId: "job-governance-v1",     totalFindings: 0, confirmedFindings: 0, threshold: 2, reached: false, votingEnds: 1_248_800 },
  "job-stablecoin-vault": { jobId: "job-stablecoin-vault",  totalFindings: 7, confirmedFindings: 5, threshold: 2, reached: true,  votingEnds: 1_248_300 },
  "job-multisig-wallet":  { jobId: "job-multisig-wallet",   totalFindings: 3, confirmedFindings: 2, threshold: 2, reached: true,  votingEnds: 1_248_000 },
  "job-token-bridge":     { jobId: "job-token-bridge",      totalFindings: 8, confirmedFindings: 6, threshold: 2, reached: true,  votingEnds: 1_247_700 },
  "job-lending-protocol": { jobId: "job-lending-protocol",  totalFindings: 4, confirmedFindings: 4, threshold: 2, reached: true,  votingEnds: 1_246_200 },
  "job-yield-aggregator": { jobId: "job-yield-aggregator",  totalFindings: 2, confirmedFindings: 2, threshold: 2, reached: true,  votingEnds: 1_245_700 },
  "job-erc20-simple":     { jobId: "job-erc20-simple",      totalFindings: 1, confirmedFindings: 1, threshold: 2, reached: true,  votingEnds: 1_241_200 },
  "job-oracle-feed":      { jobId: "job-oracle-feed",       totalFindings: 0, confirmedFindings: 0, threshold: 2, reached: false, votingEnds: 1_239_200 },
};

const SEED_ESCROW: Record<string, EscrowState> = {
  "job-dex-amm-v2":       { jobId: "job-dex-amm-v2",       submitter: ADDR.r12,    amount: 25n * POT,  status: "Staked",    openedAtBlock: 1_247_500 },
  "job-nft-marketplace":  { jobId: "job-nft-marketplace",   submitter: ADDR.r11,    amount: 50n * POT,  status: "Staked",    openedAtBlock: 1_247_200 },
  "job-governance-v1":    { jobId: "job-governance-v1",     submitter: ADDR.r10,    amount: 15n * POT,  status: "Staked",    openedAtBlock: 1_247_600 },
  "job-stablecoin-vault": { jobId: "job-stablecoin-vault",  submitter: ADDR.r9,     amount: 100n * POT, status: "Staked",    openedAtBlock: 1_247_100 },
  "job-multisig-wallet":  { jobId: "job-multisig-wallet",   submitter: ADDR.r8,     amount: 30n * POT,  status: "Staked",    openedAtBlock: 1_246_800 },
  "job-token-bridge":     { jobId: "job-token-bridge",      submitter: ADDR.r7,     amount: 75n * POT,  status: "Staked",    openedAtBlock: 1_246_500 },
  "job-lending-protocol": { jobId: "job-lending-protocol",  submitter: ADDR.ferdie, amount: 40n * POT,  status: "Staked",    openedAtBlock: 1_245_000 },
  "job-yield-aggregator": { jobId: "job-yield-aggregator",  submitter: ADDR.eve,    amount: 20n * POT,  status: "Released",  openedAtBlock: 1_244_500 },
  "job-erc20-simple":     { jobId: "job-erc20-simple",      submitter: ADDR.dave,   amount: 10n * POT,  status: "Released",  openedAtBlock: 1_240_000 },
  "job-oracle-feed":      { jobId: "job-oracle-feed",       submitter: ADDR.charlie,amount:  5n * POT,  status: "Cancelled", openedAtBlock: 1_238_000 },
};

// ─── Session Store ─────────────────────────────────────────────────────────

let _jobs: ReviewJob[]            = [...SEED_JOBS];
let _findings: Finding[]          = [...SEED_FINDINGS];
const _consensus = { ...SEED_CONSENSUS } as Record<string, ConsensusState>;
const _escrow    = { ...SEED_ESCROW }    as Record<string, EscrowState>;

// ─── Store Accessors ───────────────────────────────────────────────────────

export function getJobs(offset: number, limit: number): ReviewJob[] {
  return _jobs.slice(offset, offset + limit);
}

export function addJob(
  job: ReviewJob,
  escrow: EscrowState,
  consensus: ConsensusState
): void {
  _jobs             = [job, ..._jobs];
  _escrow[job.id]    = escrow;
  _consensus[job.id] = consensus;
}

export function getFindings(jobId: string): Finding[] {
  return _findings.filter((f) => f.jobId === jobId);
}

export function addFinding(finding: Finding): void {
  _findings = [..._findings, finding];
  const cs = _consensus[finding.jobId];
  if (cs) {
    const next: ConsensusState = {
      ...cs,
      totalFindings: cs.totalFindings + 1,
      confirmedFindings: cs.confirmedFindings + 1,
    };
    next.reached = next.confirmedFindings >= next.threshold;
    _consensus[finding.jobId] = next;

    _jobs = _jobs.map((j) => {
      if (j.id !== finding.jobId) return j;
      const updatedCount = j.findingCount + 1;
      // Promote status when consensus is newly reached
      const updatedStatus =
        next.reached && (j.status === "Open" || j.status === "InReview")
          ? ("Consensus" as const)
          : j.status === "Open"
          ? ("InReview" as const)
          : j.status;
      return { ...j, findingCount: updatedCount, status: updatedStatus };
    });
  }
}

export function getConsensus(jobId: string): ConsensusState | null {
  return _consensus[jobId] ?? null;
}

export function getEscrow(jobId: string): EscrowState | null {
  return _escrow[jobId] ?? null;
}

export function updateEscrowStatus(jobId: string, status: EscrowStatus): void {
  if (_escrow[jobId]) {
    _escrow[jobId] = { ..._escrow[jobId], status };
  }
}

export function getReputationScore(address: string): ReputationScore {
  return (
    MOCK_LEADERBOARD.find((e) => e.address === address) ?? {
      address,
      score: 1_200n,
      tier: "Journeyman",
      reviewsCompleted: 8,
      slashCount: 0,
    }
  );
}

export function getTotalStats(): { jobCount: number; potStaked: bigint; activeJobs: number } {
  const activeJobs = _jobs.filter((j) => j.status === "Open" || j.status === "InReview").length;
  const potStaked = _jobs
    .filter((j) => j.status !== "Cancelled")
    .reduce((sum, j) => sum + j.stakeAmount, 0n);
  return { jobCount: _jobs.length, potStaked, activeJobs };
}

// ─── Tx Simulation Utilities ───────────────────────────────────────────────

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function mockTxHash(): string {
  const bytes = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  ).join("");
  return `0x${bytes}`;
}
