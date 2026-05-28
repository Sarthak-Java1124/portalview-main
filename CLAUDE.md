@AGENTS.md
# CLAUDE.md — PortalReview: Reputation-Staked Peer Code Review

> This file is the authoritative guide for every engineering decision in this repository.
> Read it in full before writing a single line of code.

---


## 1. Project Overview

**PortalReview** is a decentralized peer code-review platform built on the Portaldot network.
It enables ink! contract submitters to stake POT tokens and receive reputation-backed security
reviews from incentivized reviewers — fully on-chain, trustless, and slash-protected.

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS (dark glassmorphism)
- **Blockchain Interface:** `@polkadot/api` + `@polkadot/api-contract`
- **Node:** `substrate-contracts-node` (local testnet)
- **Token:** POT — staking, slashing, reviewer rewards, gas
- **Optional (v2):** Claude Sonnet API for automated contract scoring hints

---

## 2. Non-Negotiable Engineering Principles

### 2.1 SOLID Principles

| Principle | How it applies here |
|---|---|
| **Single Responsibility** | Every file, hook, service, and component does exactly one thing. A component that fetches AND renders is wrong. |
| **Open / Closed** | Extend behaviour via new modules/hooks — never mutate a working abstraction. |
| **Liskov Substitution** | Any component accepting a `ReviewJob` must work with any valid `ReviewJob` shape — no secret runtime assumptions. |
| **Interface Segregation** | Props interfaces are minimal. A `<ReputationBadge>` doesn't receive the full `Reviewer` object — it receives only `{ score: number; address: string }`. |
| **Dependency Inversion** | UI components depend on abstractions (hooks, service interfaces) — never on concrete `@polkadot/api` calls inline. |

### 2.2 Separation of Concerns

```
UI (render)  →  Hooks (state/async)  →  Services (blockchain)  →  ABI/Config (static)
```

- **Never** call `@polkadot/api` inside a React component or a page file.
- **Never** import Tailwind utilities from non-UI files.
- **Never** store blockchain state inside a React component's `useState` — use the context layer.

### 2.3 Race Conditions — Zero Tolerance

Every async blockchain interaction is a potential race condition. Mandatory rules:

1. **Always cancel stale subscriptions** — use `useEffect` cleanup functions for every `api.query.*` subscription.
2. **Use a `isMounted` ref** or `AbortController` for every async fetch inside a hook so stale responses never commit to state.
3. **Debounce wallet-triggered effects** — connecting a wallet fires multiple events. Debounce or gate with a `ref` lock.
4. **Optimistic UI with explicit rollback** — if a tx fails after an optimistic UI update, roll back with the error state from the tx receipt.
5. **Never read-then-write** to contract storage across two separate calls without handling the TOCTOU window. Pass all inputs in a single contract call.

### 2.4 Async Patterns

- **All** blockchain calls return `Promise` — wrap with `try/catch` inside the service layer.
- **Never** `await` inside a `forEach` — use `Promise.all` with a mapped array.
- **Transaction lifecycle** must emit four events: `pending → broadcast → inBlock → finalized` (or `error`). Use `signAndSend` with the event callback pattern, not a one-shot `await`.

---

## 3. Folder Structure

```
portal-review/
├── CLAUDE.md                        ← You are here
├── .env.local                       ← WS_PROVIDER_URL, CONTRACT_ADDRESSES, etc.
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   └── abi/                         ← All contract ABI JSON files (static assets)
│       ├── escrow.json
│       ├── reputation.json
│       └── review_engine.json
│
├── src/
│   ├── app/                         ← Next.js App Router pages only
│   │   ├── layout.tsx               ← Root layout: providers, fonts, global shell
│   │   ├── page.tsx                 ← Landing / hero page
│   │   ├── dashboard/
│   │   │   └── page.tsx             ← Active review queue dashboard
│   │   ├── submit/
│   │   │   └── page.tsx             ← Contract submission + staking flow
│   │   ├── review/
│   │   │   ├── page.tsx             ← Reviewer workspace (find + stake + submit)
│   │   │   └── [jobId]/
│   │   │       └── page.tsx         ← Single job detail view
│   │   ├── leaderboard/
│   │   │   └── page.tsx             ← Reputation leaderboard
│   │   └── api/                     ← Next.js route handlers (server-side only)
│   │       └── health/
│   │           └── route.ts         ← Node connectivity health check
│   │
│   ├── components/                  ← Pure presentational UI — no data fetching
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         ← Sidebar + topbar wrapper
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── ui/                      ← Atomic, reusable design-system components
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Tooltip.tsx
│   │   ├── review/
│   │   │   ├── ReviewCard.tsx       ← Single job card (queue list item)
│   │   │   ├── ReviewQueue.tsx      ← List of ReviewCard, accepts data as prop
│   │   │   ├── FindingForm.tsx      ← Reviewer finding submission form
│   │   │   └── ConsensusBar.tsx     ← Visual threshold progress bar
│   │   ├── reputation/
│   │   │   ├── ReputationBadge.tsx  ← Score + tier chip
│   │   │   └── LeaderboardRow.tsx
│   │   ├── staking/
│   │   │   ├── StakeInput.tsx       ← POT amount input with balance display
│   │   │   └── TxStatusBanner.tsx   ← pending / inBlock / finalized / error
│   │   └── wallet/
│   │       ├── WalletButton.tsx     ← Connect / disconnect + address pill
│   │       └── AccountSelector.tsx  ← Dropdown for multi-account wallets
│   │
│   ├── hooks/                       ← All state and async logic lives here
│   │   ├── useApi.ts                ← Single ApiPromise instance from context
│   │   ├── useWallet.ts             ← Wallet connection state, accounts, signer
│   │   ├── useBalance.ts            ← POT balance for a given address
│   │   ├── useEscrow.ts             ← Submit, cancel, query escrow state
│   │   ├── useReputation.ts         ← Fetch reputation score, subscribe to changes
│   │   ├── useReviewEngine.ts       ← Submit finding, fetch consensus state
│   │   ├── useReviewQueue.ts        ← Paginated list of active review jobs
│   │   ├── useTxBuilder.ts          ← Generic tx lifecycle hook (pending→finalized)
│   │   └── useLeaderboard.ts        ← Top-N reputation holders
│   │
│   ├── services/                    ← Blockchain interaction layer — no React
│   │   ├── api.service.ts           ← WsProvider + ApiPromise singleton factory
│   │   ├── contract.service.ts      ← ContractPromise factory, ABI loader
│   │   ├── escrow.service.ts        ← stake(), release(), cancel(), query()
│   │   ├── reputation.service.ts    ← getScore(), slash(), reward()
│   │   └── reviewEngine.service.ts  ← submitFinding(), getConsensus(), getJobs()
│   │
│   ├── context/                     ← React context providers (app-level state)
│   │   ├── ApiContext.tsx           ← Provides live ApiPromise + connection status
│   │   ├── WalletContext.tsx        ← Provides accounts, signer, selectedAccount
│   │   └── ToastContext.tsx         ← Global toast/notification queue
│   │
│   ├── types/                       ← TypeScript types and interfaces only
│   │   ├── review.types.ts          ← ReviewJob, Finding, ConsensusState
│   │   ├── reputation.types.ts      ← Reviewer, ReputationScore, SlashEvent
│   │   ├── staking.types.ts         ← StakeReceipt, TxStatus, EscrowState
│   │   └── api.types.ts             ← PolkadotApiStatus, ContractCallResult
│   │
│   ├── lib/                         ← Pure utility functions — no side effects
│   │   ├── format.ts                ← formatPOT(), truncateAddress(), formatDate()
│   │   ├── validation.ts            ← isValidHash(), isValidAddress(), etc.
│   │   ├── constants.ts             ← REVIEW_WINDOW_BLOCKS, CONSENSUS_THRESHOLD, etc.
│   │   └── abi.ts                   ← ABI file loader helpers
│   │
│   └── styles/
│       └── globals.css              ← Tailwind base + custom CSS vars for glassmorphism
```

---

## 4. Module Contracts (What Each Layer May and May Not Do)

### `app/` — Pages

| ✅ MAY | ❌ MUST NOT |
|---|---|
| Import hooks | Import services directly |
| Import components | Call `@polkadot/api` |
| Use `Suspense` + `loading.tsx` | Contain business logic |
| Pass data down via props | Hold complex local state |

### `components/` — UI

| ✅ MAY | ❌ MUST NOT |
|---|---|
| Receive data via typed props | Fetch data |
| Emit events via callbacks | Import hooks |
| Use Tailwind classes | Import services |
| Be composed from `ui/` atoms | Have side effects |

### `hooks/` — State & Async Orchestration

| ✅ MAY | ❌ MUST NOT |
|---|---|
| Call service functions | Render JSX |
| Use `useContext` | Use Tailwind / CSS |
| Manage loading/error/data state | Call `@polkadot/api` directly |
| Subscribe and clean up | Duplicate service logic |

### `services/` — Blockchain

| ✅ MAY | ❌ MUST NOT |
|---|---|
| Call `@polkadot/api` | Import React |
| Return typed Promises | Access React state |
| Throw typed errors | Format for UI display |
| Accept `ApiPromise`, `ContractPromise`, `KeyringPair` as args | Hold singleton state (except `api.service.ts`) |

---

## 5. Critical Implementation Patterns

### 5.1 ApiPromise Singleton

`services/api.service.ts` is the **only** file allowed to create an `ApiPromise`.
It must return the same instance for the entire app lifetime.

```typescript
// services/api.service.ts
import { ApiPromise, WsProvider } from '@polkadot/api';

let instance: ApiPromise | null = null;
let connecting: Promise<ApiPromise> | null = null;

export async function getApi(): Promise<ApiPromise> {
  if (instance?.isConnected) return instance;
  if (connecting) return connecting;

  connecting = ApiPromise.create({
    provider: new WsProvider(process.env.NEXT_PUBLIC_WS_PROVIDER_URL!),
  }).then((api) => {
    instance = api;
    connecting = null;
    return api;
  });

  return connecting;
}

export async function disconnectApi(): Promise<void> {
  if (instance) {
    await instance.disconnect();
    instance = null;
  }
}
```

### 5.2 Subscription with Race-Condition-Safe Cleanup

```typescript
// hooks/useReputation.ts — correct pattern
export function useReputation(address: string | null) {
  const api = useApi();
  const [score, setScore] = useState<bigint | null>(null);

  useEffect(() => {
    if (!api || !address) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      unsubscribe = await reputationService.subscribeScore(
        api,
        address,
        (newScore) => {
          if (!cancelled) setScore(newScore);
        }
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [api, address]);

  return score;
}
```

### 5.3 Transaction Lifecycle — Never a One-Shot Await

```typescript
// services/escrow.service.ts
export function stake(
  api: ApiPromise,
  contract: ContractPromise,
  signer: KeyringPair,
  amount: bigint,
  onStatus: (status: TxStatus) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    contract.tx
      .stake({ value: amount, gasLimit: -1 })
      .signAndSend(signer, ({ status, dispatchError }) => {
        if (status.isInBlock) {
          onStatus({ phase: 'inBlock', blockHash: status.asInBlock.toString() });
        }
        if (status.isFinalized) {
          if (dispatchError) {
            reject(new EscrowError(api, dispatchError));
          } else {
            onStatus({ phase: 'finalized' });
            resolve();
          }
        }
      })
      .catch(reject);
  });
}
```

### 5.4 Hook Using the Tx Builder

```typescript
// hooks/useTxBuilder.ts
export function useTxBuilder() {
  const [status, setStatus] = useState<TxStatus>({ phase: 'idle' });

  const execute = useCallback(
    async (txFn: (onStatus: (s: TxStatus) => void) => Promise<void>) => {
      setStatus({ phase: 'pending' });
      try {
        await txFn((s) => setStatus(s));
      } catch (err) {
        setStatus({ phase: 'error', message: (err as Error).message });
      }
    },
    []
  );

  return { status, execute };
}
```

### 5.5 Component — Props-Only, Zero Side Effects

```typescript
// components/staking/StakeInput.tsx
interface StakeInputProps {
  balance: bigint;
  value: bigint;
  onChange: (amount: bigint) => void;
  disabled?: boolean;
}

export function StakeInput({ balance, value, onChange, disabled }: StakeInputProps) {
  // Pure render — no hooks beyond local UI state
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-white/60">Amount (POT)</label>
      <input
        type="number"
        disabled={disabled}
        value={formatPOT(value)}
        onChange={(e) => onChange(parsePOT(e.target.value))}
        className="glass-input"
      />
      <span className="text-xs text-white/40">Balance: {formatPOT(balance)} POT</span>
    </div>
  );
}
```

---

## 6. Type Safety Rules

1. **No `any`** — ever. Use `unknown` and narrow. CI will fail on `any`.
2. **All contract call return values** must be decoded through a typed wrapper — never cast a raw `Codec` to a business type directly.
3. **Error types** are defined in `types/api.types.ts`. Services throw typed errors, not raw strings.
4. **All environment variables** accessed through a validated config object in `lib/constants.ts` — never `process.env.X` inline.

```typescript
// lib/constants.ts
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const CONFIG = {
  wsProviderUrl: requireEnv('NEXT_PUBLIC_WS_PROVIDER_URL'),
  escrowAddress: requireEnv('NEXT_PUBLIC_ESCROW_ADDRESS'),
  reputationAddress: requireEnv('NEXT_PUBLIC_REPUTATION_ADDRESS'),
  reviewEngineAddress: requireEnv('NEXT_PUBLIC_REVIEW_ENGINE_ADDRESS'),
} as const;

export const CONSENSUS_THRESHOLD = 2; // 2-of-3 senior reviewers
export const REVIEW_WINDOW_BLOCKS = 1200; // ~4 hours on Portaldot
export const MIN_REVIEWER_REPUTATION = 100n;
```

---

## 7. Error Handling Strategy

Every layer has a defined error boundary:

| Layer | Strategy |
|---|---|
| **Services** | Throw typed `class EscrowError extends Error`, `class ReputationError extends Error`, etc. |
| **Hooks** | Catch service errors, store in `error` state, never re-throw to React |
| **Components** | Display error state via props — no `try/catch` |
| **Pages** | Wrap in Next.js `error.tsx` boundary for unhandled failures |

---

## 8. State Management Rules

- **No global state library** (no Redux, no Zustand) unless the project grows beyond 3 shared slices. Use React Context for the three shared concerns: `ApiContext`, `WalletContext`, `ToastContext`.
- **Server Components** for all pages that display static or infrequently-changing data (leaderboard snapshot, job metadata). Use `'use client'` only at the hook/interaction boundary.
- **Derived state** is computed inside the hook or component — never stored as a duplicate `useState`.

---

## 9. Styling Conventions

- **Tailwind only** — no inline `style={}` props, no CSS Modules, no styled-components.
- **Dark glassmorphism** — base variables defined in `globals.css`:

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: blur(12px);
  --accent: #7c3aed;       /* POT purple */
  --accent-glow: #a855f7;
  --danger: #ef4444;
  --success: #22c55e;
}

.glass-card {
  @apply bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl;
}
.glass-input {
  @apply bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500;
}
```

- **Component class names** are defined at the component level, not scattered across pages.

---

## 10. File & Naming Conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase `.tsx` | `ReviewCard.tsx` |
| Hooks | camelCase with `use` prefix | `useReputation.ts` |
| Services | camelCase with `.service.ts` suffix | `escrow.service.ts` |
| Types files | camelCase with `.types.ts` suffix | `review.types.ts` |
| Utility functions | camelCase in `lib/` | `format.ts` |
| Constants | `SCREAMING_SNAKE_CASE` in `lib/constants.ts` | `CONSENSUS_THRESHOLD` |
| Context providers | PascalCase with `Context` suffix | `ApiContext.tsx` |

---

## 11. What To Build — Feature Order

Build in this sequence. **Do not start the next phase until the current one is tested.**

### Phase 1 — Blockchain Foundation (no UI)
1. `services/api.service.ts` — singleton, reconnection logic
2. `services/contract.service.ts` — ABI loader, `ContractPromise` factory
3. `services/escrow.service.ts` — `stake()`, `release()`, `getState()`
4. `services/reputation.service.ts` — `getScore()`, `subscribeScore()`
5. `services/reviewEngine.service.ts` — `submitFinding()`, `getConsensus()`
6. `context/ApiContext.tsx` + `context/WalletContext.tsx`
7. `hooks/useApi.ts`, `hooks/useWallet.ts`, `hooks/useBalance.ts`

### Phase 2 — Core Hooks
8. `hooks/useTxBuilder.ts`
9. `hooks/useEscrow.ts`
10. `hooks/useReputation.ts`
11. `hooks/useReviewEngine.ts`
12. `hooks/useReviewQueue.ts`

### Phase 3 — UI Atoms
13. All `components/ui/` atoms (Button, Card, Badge, Modal, Spinner, Toast)
14. `components/wallet/WalletButton.tsx`
15. `components/staking/StakeInput.tsx` + `TxStatusBanner.tsx`

### Phase 4 — Feature Components + Pages
16. `components/review/ReviewCard.tsx` + `ReviewQueue.tsx`
17. `components/reputation/ReputationBadge.tsx`
18. `app/dashboard/page.tsx`
19. `app/submit/page.tsx`
20. `app/review/page.tsx` + `app/review/[jobId]/page.tsx`
21. `app/leaderboard/page.tsx`

### Phase 5 — Polish
22. `components/review/FindingForm.tsx` + `ConsensusBar.tsx`
23. Loading skeletons (`loading.tsx`) for each route
24. `error.tsx` boundaries for each route
25. Toast notifications wired end-to-end

---

## 12. Pre-Commit Checklist

Before marking any task complete, verify:

- [ ] No `@polkadot/api` imported outside `services/`
- [ ] No data fetching inside a component file
- [ ] Every `useEffect` with an async operation has a cleanup/cancel
- [ ] Every service function has a typed return type — no `Promise<any>`
- [ ] No `process.env` accessed outside `lib/constants.ts`
- [ ] All subscription `unsubscribe` calls are in `useEffect` cleanup
- [ ] Optimistic UI updates have an explicit rollback path on error
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)

---

*PortalReview — Built for Portaldot Online Mini Hackathon S1 — Submissions close May 31, 2026*