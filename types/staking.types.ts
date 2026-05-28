export type TxStatus =
  | "idle"
  | "pending"
  | "broadcast"
  | "inBlock"
  | "finalized"
  | "error";

export interface TxEvent {
  status: TxStatus;
  txHash?: string;
  blockHash?: string;
  error?: string;
}

export interface StakeReceipt {
  jobId: string;
  staker: string;
  amount: bigint;
  txHash: string;
  blockHash: string;
}

export type EscrowStatus = "None" | "Staked" | "Released" | "Cancelled";

export interface EscrowState {
  jobId: string;
  submitter: string;
  amount: bigint;
  status: EscrowStatus;
  openedAtBlock: number;
}
