import "dotenv/config";
import {isHex, type Hex} from "viem";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function parseAddress(name: string, value: string): `0x${string}` {
  if (!isHex(value) || value.length !== 42) {
    throw new Error(`Invalid address for ${name}: ${value}`);
  }
  return value.toLowerCase() as `0x${string}`;
}

export type EventSourceMode = "goldsky" | "rpc";

function parseEventSource(): EventSourceMode {
  const raw = (process.env.EVENT_SOURCE || "goldsky").trim().toLowerCase();
  if (raw === "rpc") return "rpc";
  return "goldsky";
}

export const config = {
  rpcUrl: optionalEnv("RPC_URL", "http://127.0.0.1:8545"),
  chainId: Number(optionalEnv("CHAIN_ID", "31337")),
  poolAddress: parseAddress(
    "BULLET_POOL_ADDRESS",
    optionalEnv("BULLET_POOL_ADDRESS", "0x0000000000000000000000000000000000000000")
  ),
  rootManagerAddress: parseAddress(
    "MERKLE_ROOT_MANAGER_ADDRESS",
    optionalEnv(
      "MERKLE_ROOT_MANAGER_ADDRESS",
      "0x0000000000000000000000000000000000000000"
    )
  ),
  relayerPrivateKey: (process.env.RELAYER_PRIVATE_KEY?.trim() || "") as Hex | "",
  databaseUrl: requireEnv("DATABASE_URL"),
  confirmations: Number(optionalEnv("CONFIRMATIONS", "8")),
  pollIntervalMs: Number(optionalEnv("POLL_INTERVAL_MS", "4000")),
  startBlock: Number(optionalEnv("START_BLOCK", "0")),
  treeDepth: Number(optionalEnv("TREE_DEPTH", "20")),
  apiPort: Number(optionalEnv("API_PORT", "4010")),
  skipPostRoot: optionalEnv("SKIP_POST_ROOT", "0") === "1",
  eventSource: parseEventSource(),
  goldskyBulletPoolUrl: (
    process.env.GOLDSKY_BULLET_POOL_URL ||
    "https://api.goldsky.com/api/public/project_cmrzb84g5syuc01vz6wx2ad6n/subgraphs/BulletPool/1.0.0/gn"
  ).trim(),
  goldskyRootManagerUrl: (
    process.env.GOLDSKY_ROOT_MANAGER_URL ||
    "https://api.goldsky.com/api/public/project_cmrzb84g5syuc01vz6wx2ad6n/subgraphs/MerkleRootManager/1.0.0/gn"
  ).trim(),
};

export function assertRuntimeConfig(): void {
  if (config.poolAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("BULLET_POOL_ADDRESS is required");
  }
  if (
    config.rootManagerAddress === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error("MERKLE_ROOT_MANAGER_ADDRESS is required");
  }
  if (!config.skipPostRoot && !config.relayerPrivateKey) {
    throw new Error("RELAYER_PRIVATE_KEY is required unless SKIP_POST_ROOT=1");
  }
  if (config.confirmations < 1) {
    throw new Error("CONFIRMATIONS must be >= 1");
  }
  if (config.eventSource === "goldsky" && !config.goldskyBulletPoolUrl) {
    throw new Error(
      "GOLDSKY_BULLET_POOL_URL is required when EVENT_SOURCE=goldsky"
    );
  }
}

export function hasContractConfig(): boolean {
  return (
    config.poolAddress !== "0x0000000000000000000000000000000000000000" &&
    config.rootManagerAddress !== "0x0000000000000000000000000000000000000000"
  );
}
