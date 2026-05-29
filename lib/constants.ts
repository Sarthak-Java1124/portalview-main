// Env vars are optional — app runs in demo/mock mode when they are absent.
// Set real values in .env.local after deploying contracts to the Portaldot testnet.
const _wsUrl      = process.env.NEXT_PUBLIC_WS_PROVIDER_URL      ?? "";
const _escrowAddr = process.env.NEXT_PUBLIC_ESCROW_ADDRESS        ?? "";
const _repAddr    = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS    ?? "";
const _engAddr    = process.env.NEXT_PUBLIC_REVIEW_ENGINE_ADDRESS ?? "";

// NEXT_PUBLIC_DEMO_MODE=true forces mock data even when contract addresses are set.
// Set this in your Vercel/Netlify env vars so distributed users get the demo experience
// without needing a running local Portaldot node.
const _forceDemo  = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const CONFIG = {
  wsProviderUrl:       _wsUrl,
  escrowAddress:       _escrowAddr,
  reputationAddress:   _repAddr,
  reviewEngineAddress: _engAddr,
} as const;

/** True when all four env vars are set, a live node URL is present, and demo mode is off. */
export const IS_LIVE_MODE = !_forceDemo && Boolean(_wsUrl && _escrowAddr && _repAddr && _engAddr);

/** 2-of-N consensus threshold — must match CONSENSUS_THRESHOLD in review_engine.rs. */
export const CONSENSUS_THRESHOLD = 2;

/** Review window in blocks (~2 s/block → ~40 min). Must match REVIEW_WINDOW_BLOCKS in review_engine.rs. */
export const REVIEW_WINDOW_BLOCKS = 1200;

/** Minimum reputation score to submit a finding. */
export const MIN_REVIEWER_REPUTATION = 100n;

/** POT bond a reviewer must attach when submitting a finding (1 POT in planck). */
export const REVIEWER_BOND_PLANCK = 1_000_000_000_000n;

export const GAS_REF_TIME   = 30_000_000_000n;
export const GAS_PROOF_SIZE = 1_048_576n;

export const PAGE_SIZE        = 20;
export const LEADERBOARD_SIZE = 50;

export const APP_NAME    = "PortalReview";
export const APP_DAPP_ID = "portal-review";

// Alice's well-known dev account — used as caller for unauthenticated read-only contract queries
// Valid on any substrate --dev node; replace with a real account for production.
export const ZERO_CALLER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
