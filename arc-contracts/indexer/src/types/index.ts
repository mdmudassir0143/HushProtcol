export interface DepositRecord {
  id?: string;
  commitment: string;
  leafIndex: number;
  token: string;
  amount: string;
  blockNumber: number;
  blockHash: string;
  txHash: string;
  logIndex: number;
  finalized: boolean;
  createdAt?: Date;
}

export interface MerkleRootRecord {
  id?: number;
  root: string;
  leafCount: number;
  blockNumber: number | null;
  posted: boolean;
  postedTxHash: string | null;
  createdAt?: Date;
}

export interface SyncState {
  lastProcessedBlock: number;
  lastRoot: string | null;
  treeDepth: number;
  updatedAt?: Date;
}

export interface DepositEvent {
  commitment: `0x${string}`;
  leafIndex: number;
  token: `0x${string}`;
  amount: bigint;
  blockNumber: number;
  blockHash: `0x${string}`;
  txHash: `0x${string}`;
  logIndex: number;
}

export interface WitnessResponse {
  root: string;
  leafIndex: number;
  siblings: string[];
  pathIndices: number[];
}
