/**
 * API types used by the frontend against backend + indexer.
 *
 * Crypto / proving: Hushh Protocol SDK (linked later).
 * Chain calls: viem / contracts on Arc.
 */

// ─── Users / auth (arc-contracts/backend) ─────────────────────────────

/** Public profile returned by GET /users/:username and auth responses. */
export interface PublicUser {
  id: string;
  /** Lowercase checksummed-normalized EVM address. */
  wallet: string;
  /** Lowercase, no leading @. */
  username: string;
  /** 0x-prefixed 32-byte hex Hushh Protocol public key (encryption). */
  bulletPublicKey: string;
  /** Linked X/Twitter handle (no @), from Privy. */
  twitterUsername?: string | null;
  createdAt?: string | Date;
}

export interface WalletAuthRequest {
  wallet: string;
  username: string;
  bulletPublicKey: string;
  /** personal_sign of the auth message. */
  signature: `0x${string}`;
}

export interface AuthMessageResponse {
  message: string;
}

export interface WalletAuthResponse {
  token: string;
  user: PublicUser;
  message: string;
}

/**
 * Username resolve result for the send flow.
 * Prefer GET /users/:username (404 = unregistered).
 */
export interface ResolveResult {
  found: boolean;
  user?: PublicUser;
}

// ─── Notes / encrypted inbox (arc-contracts/backend) ──────────────────

export interface Note {
  id: string;
  recipientId: string;
  senderId?: string;
  /** 0x-prefixed 32-byte Poseidon commitment. */
  commitment: string;
  /** Client-sealed ciphertext (base64 or hex). Backend never decrypts. */
  encryptedPayload: string;
  claimed: boolean;
  /** Withdraw tx hash when claimed. */
  claimTxHash?: string;
  /** Deposit tx hash when sent. */
  depositTxHash?: string;
  /** Human amount for history UI. */
  amount?: string;
  /** Pool token symbol (USDC, EURC, cirBTC, USYC, …). */
  tokenSymbol?: string;
  recipientUsername?: string;
  createdAt: string | Date;
}

export interface NoteHistoryItem {
  id: string;
  direction: "sent" | "received";
  commitment: string;
  claimed: boolean;
  claimTxHash?: string;
  depositTxHash?: string;
  amount?: string;
  tokenSymbol?: string;
  createdAt: string | Date;
  /** Sender @username */
  fromUsername?: string;
  /** Recipient @username */
  toUsername?: string;
  fromWallet?: string;
  toWallet?: string;
  counterpartyUsername?: string;
  counterpartyWallet?: string;
}

export interface NoteHistoryPage {
  items: NoteHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  direction: "sent" | "received";
}

export interface CreateNoteRequest {
  recipientUsername?: string;
  recipientId?: string;
  commitment: string;
  encryptedPayload: string;
  depositTxHash?: string;
  amount?: string;
  tokenSymbol?: string;
}

export interface ClaimNoteResponse {
  id: string;
  claimed: boolean;
  commitment: string;
  claimTxHash?: string;
}

export interface ApiError {
  error: string;
}

// ─── Indexer (arc-contracts/indexer) ──────────────────────────────────

export interface IndexerHealth {
  ok: boolean;
  service?: string;
}

export interface IndexerRootResponse {
  root: string;
  leafCount: number;
  posted?: boolean;
}

/** GET /witness/:commitment — Merkle path for proving. No secrets. */
export interface WitnessResponse {
  root: string;
  leafIndex: number;
  siblings: string[];
  pathIndices: number[];
}

// ─── Network / deployments ───────────────────────────────────────────

export interface ArcNetworkConfig {
  chainId: 5042002;
  name: "Arc Testnet";
  rpcUrl: string;
  explorerUrl: string;
}

export interface HushDeployments {
  bulletPool: `0x${string}`;
  merkleRootManager: `0x${string}`;
  verifier: `0x${string}`;
  mockUsdc?: `0x${string}`;
}

/** Arc Testnet deploy — mirrors arc-contracts/deployments/arcTestnet.json */
export const ARC_TESTNET_DEPLOYMENT = {
  chainId: 5042002,
  deployer: "0xdAF0182De86F904918Db8d07c7340A1EfcDF8244",
  bulletPool: "0x9E65584C6ACE76cEFde4FD5f50E6bB9763999dCe",
  merkleRootManager: "0x6D6530A1fC908792DA2aa533a5F299283E6F062a",
  verifier: "0x0A95c430Bf6AA3140A4Bf04C8D5982472331008d",
  mockUsdc: "0x7d7aF5715e5671e0E3126b2428Dc2629bD9061e3",
} as const satisfies HushDeployments & {
  chainId: number;
  deployer: `0x${string}`;
};

/** Prefer NEXT_PUBLIC_* env, fall back to ARC_TESTNET_DEPLOYMENT. */
export function getDeployments(): HushDeployments {
  const env = (key: string, fallback: `0x${string}`): `0x${string}` => {
    const v = process.env[key];
    return (v && /^0x[a-fA-F0-9]{40}$/.test(v) ? v : fallback) as `0x${string}`;
  };
  return {
    bulletPool: env(
      "NEXT_PUBLIC_BULLET_POOL_ADDRESS",
      ARC_TESTNET_DEPLOYMENT.bulletPool
    ),
    merkleRootManager: env(
      "NEXT_PUBLIC_MERKLE_ROOT_MANAGER_ADDRESS",
      ARC_TESTNET_DEPLOYMENT.merkleRootManager
    ),
    verifier: env(
      "NEXT_PUBLIC_VERIFIER_ADDRESS",
      ARC_TESTNET_DEPLOYMENT.verifier
    ),
    mockUsdc: env(
      "NEXT_PUBLIC_USDC_ADDRESS",
      ARC_TESTNET_DEPLOYMENT.mockUsdc
    ),
  };
}
