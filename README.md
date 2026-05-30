# PortalReview — Project Description

## What it is

PortalReview is a decentralized, reputation-staked peer code-review protocol built natively on the **Portaldot** chain. It replaces slow, expensive smart contract audits with a trustless, continuous review market — where reviewers stake POT tokens to back their findings, earn rewards for consensus-validated discoveries, and build an immutable on-chain reputation that governs their access and earning power across the entire ecosystem.

It is built as three native **ink!** smart contracts on a Substrate-based, **non-EVM** chain, with POT as the gas and incentive token. Every review job, finding, escrow lock, reputation score, slash, and reward distribution is fully on-chain state — nothing depends on a centralized off-chain oracle or indexer.

---

## The problem

Smart contract security is the critical bottleneck in the Substrate / ink! ecosystem:

- **$60,000** — the average cost of a standard ink! contract audit from a top-tier firm.
- **6 weeks** — typical time-to-report, which breaks hackathon and startup timelines entirely.
- **85%** of ink! contracts ship to mainnet with zero formal review.

The root cause is structural: traditional audits are serial, gated by a handful of credentialed firms, and produce a one-shot static report with no on-chain accountability for the auditor. If a critical finding is missed, there is no slash, no reputation penalty, no recourse — and no way to distinguish a thorough reviewer from a perfunctory one after the fact.

PortalReview fixes this at the protocol level. Reputation is not self-reported; it is staked, slashed, and accumulated on-chain. Consensus is not editorial; it is game-theoretic and threshold-enforced. Incentives are not advisory; they are cryptographically locked and automatically released.

---

## How it works

### Protocol flow — three roles, one on-chain lifecycle

**Submitters** post a review job by locking POT into the escrow contract alongside the contract's hash and (optionally) a GitHub URL. The locked stake signals seriousness and funds the reviewer reward pool. A job window of **~4 hours** (1,200 blocks) opens.

**Reviewers** browse the open queue and stake POT to claim a slot on a job. Staking is the credibility signal — a reviewer with no skin in the game cannot participate, and a reviewer who submits a fabricated or duplicate finding is slashed. Each reviewer submits structured findings — title, severity (`Critical` / `High` / `Medium` / `Low` / `Informational`), description, and optional line-range — directly as an on-chain transaction.

**Consensus engine** validates findings once the review window closes. A finding is confirmed when it reaches the **2-of-3 senior reviewer threshold** (`CONSENSUS_THRESHOLD = 2`). Confirmed findings trigger reward release from escrow; contested or lone findings that fail threshold earn nothing and may slash the submitter's stake.

### Job lifecycle

```
Open → InReview → Consensus → Finalized
                            ↘ Cancelled  (submitter withdraws before window closes)
```

### Escrow lifecycle

```
None → Staked → Released   (consensus reached, rewards distributed)
             → Cancelled   (no quorum, submitter reclaims)
```

### Transaction lifecycle (every action)

```
pending → broadcast → inBlock → finalized
                              ↘ error  (dispatchError triggers typed rollback)
```

### Reputation — the immutable on-chain track record

Every reviewer accumulates a `ReputationScore` — a `bigint` score tied to their SS58 address, derived from confirmed findings minus slash events. The score gates tier progression:

| Tier | Access level |
|---|---|
| Novice | Can claim open jobs, limited slot priority |
| Apprentice | Standard queue access |
| Journeyman | Higher reward multiplier |
| Senior | Counts toward consensus threshold |
| Expert | Priority slot allocation |
| Legend | Protocol governance weight |

`MIN_REVIEWER_REPUTATION = 100` is enforced at the contract level — below this threshold, a reviewer cannot stake on any job, preventing Sybil flooding by freshly-created accounts.

A `SlashEvent` (reviewer address, jobId, amount slashed, reason, block number) is immutably recorded on every penalty. The full slash history is readable by any dApp — reputation is not just a score, it is an auditable trail.

---

## Technical architecture

```
Next.js dApp ── @polkadot/api ── substrate-contracts-node (Portaldot testnet / mainnet)
                                          │ cross-contract calls
                            escrow · reputation · review_engine
```

**Three ink! contracts (cross-wired):**

| Contract | Role |
|---|---|
| `escrow` | POT lock / release / cancel; maps `jobId → EscrowState`; controller-gated release; typed `EscrowError` on every failure path. |
| `reputation` | Source of truth for `address → ReputationScore`; exposes `getScore()`, `subscribeScore()`, `slash()`, `reward()`; enforces `MIN_REVIEWER_REPUTATION` gate. |
| `review_engine` | Public entry point: `submitFinding()`, `getConsensus()`, `getJobs()`; drives the `Open → InReview → Consensus → Finalized` state machine; computes threshold and triggers escrow release. |

**Frontend layer:**

The dApp is built on **Next.js (App Router) + TypeScript + Tailwind CSS** with a dark glassmorphism design system. It connects to the chain exclusively through `@polkadot/api` + `@polkadot/api-contract`, wrapped in a strict four-layer architecture that eliminates an entire class of race conditions and stale-subscription bugs endemic to blockchain frontends:

```
UI components (props-only, zero side effects)
      ↓
React hooks  (all state, all async, subscription cleanup)
      ↓
Service layer (pure @polkadot/api calls, typed Promises, no React imports)
      ↓
ABI / config (static, validated, never process.env inline)
```

Every `api.query.*` subscription has an `unsubscribe` cleanup. Every async hook carries an `isMounted` guard so stale chain responses never commit to state after unmount. Every transaction emits the four canonical lifecycle events — `pending → broadcast → inBlock → finalized` — via `signAndSend`'s event callback, never a one-shot `await`, so the UI can display granular progress and roll back optimistic updates precisely on `dispatchError`.

**Key on-chain data types (TypeScript ↔ ink! symmetric):**

```typescript
// A single active review job
interface ReviewJob {
  id: string;          contractHash: string;    githubUrl?: string;
  submitter: string;   stakeAmount: bigint;     rewardPool: bigint;
  status: ReviewJobStatus;                      findingCount: number;
  openedAtBlock: number;   closesAtBlock: number;
}

// A reviewer's finding
interface Finding {
  id: string;   jobId: string;   reviewer: string;
  severity: FindingSeverity;     title: string;    description: string;
  lineStart?: number;   lineEnd?: number;   submittedAtBlock: number;
}

// Live consensus snapshot
interface ConsensusState {
  jobId: string;   totalFindings: number;   confirmedFindings: number;
  threshold: number;   reached: boolean;   votingEnds: number;
}
```

All contract return values are decoded through typed wrappers — raw `Codec` is never cast directly to a business type. The `ApiPromise` is a singleton; reconnection logic prevents duplicate WebSocket connections across hot reloads.

---

## Business model & token economics

PortalReview monetizes through **stake-and-reward flows in POT**, creating aligned incentives at every role:

**Submitter stake** — POT locked into escrow to open a review job signals genuine demand and funds the reward pool. If a submitter cancels before quorum, they reclaim their stake minus a small protocol fee. If consensus is reached, the pool is split among confirmed reviewers proportional to finding severity weight.

**Reviewer stake** — POT staked to claim a slot on a job. A fabricated or uncorroborated finding results in a `SlashEvent` and permanent reputation damage. Correct findings that reach consensus threshold earn a share of the reward pool plus a reputation increment. The slash mechanism makes low-quality reviews directly expensive, not merely unproductive.

**Reputation as career capital** — a reviewer's `ReputationScore` and tier are portable across every dApp that reads the `reputation` contract. A Legend-tier reviewer on PortalReview is a credentialed security expert whose track record is publicly auditable, un-forgeable, and composable into future protocols — hiring marketplaces, grants, governance — without any off-chain certificate authority.

**Continuous market, not batch auction** — jobs open and close on a 1,200-block rolling window, so review capacity is not gated by firm availability or scheduling. A team can submit a contract at midnight and have findings within four hours.

---

## Why it matters

PortalReview is the missing **trust primitive** for the Portaldot smart contract ecosystem. Today, every team that ships an ink! contract must either pay $60K and wait six weeks, or ship blind. Neither is acceptable for a thriving developer ecosystem.

By making reputation on-chain, slashing game-theoretically sound, and incentives cryptographically enforced, PortalReview creates the conditions for a self-sustaining security market: reviewers compete to build reputation, submitters compete to attract high-reputation reviewers, and the protocol grows more secure as it grows more used — exactly the compounding dynamic that makes a protocol a platform.

> *PortalReview does not compete with auditing firms.*
> *It makes world-class security review accessible to every ink! developer on day one.*

---

*PortalReview — Built for Portaldot Online Mini Hackathon S1*
*ink! contracts · @polkadot/api · Next.js · TypeScript · Tailwind · POT*
