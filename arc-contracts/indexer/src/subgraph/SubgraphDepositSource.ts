import type {DepositEvent} from "../types/index.js";
import {subgraphQuery} from "./client.js";

export type DepositSource = {
  latestBlock(): Promise<number>;
  fetchDeposits(fromBlock: number, toBlock: number): Promise<DepositEvent[]>;
};

type SubgraphDeposit = {
  id: string;
  commitment: string | null;
  leafIndex: string | null;
  token: string | null;
  amount: string | null;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
};

/**
 * Fetch BulletPool Deposit entities from The Graph instead of eth_getLogs.
 * Indexer still finalizes leaves, builds Poseidon tree, posts roots, serves witnesses.
 */
export class SubgraphDepositSource implements DepositSource {
  constructor(private readonly endpoint: string) {}

  async latestBlock(): Promise<number> {
    const data = await subgraphQuery<{_meta: {block: {number: number}}}>(
      this.endpoint,
      `{ _meta { block { number } } }`
    );
    return Number(data._meta.block.number);
  }

  async fetchDeposits(
    fromBlock: number,
    toBlock: number
  ): Promise<DepositEvent[]> {
    if (toBlock < fromBlock) return [];

    const pageSize = 500;
    const events: DepositEvent[] = [];
    let skip = 0;

    for (;;) {
      const data = await subgraphQuery<{deposits: SubgraphDeposit[]}>(
        this.endpoint,
        `query Deposits($from: BigInt!, $to: BigInt!, $first: Int!, $skip: Int!) {
          deposits(
            first: $first
            skip: $skip
            orderBy: blockNumber
            orderDirection: asc
            where: { blockNumber_gte: $from, blockNumber_lte: $to }
          ) {
            id
            commitment
            leafIndex
            token
            amount
            blockNumber
            transactionHash
            logIndex
          }
        }`,
        {
          from: String(fromBlock),
          to: String(toBlock),
          first: pageSize,
          skip,
        }
      );

      const batch = data.deposits ?? [];
      for (const d of batch) {
        const ev = mapDeposit(d);
        if (ev) events.push(ev);
      }

      if (batch.length < pageSize) break;
      skip += pageSize;
    }

    events.sort((a, b) =>
      a.blockNumber !== b.blockNumber
        ? a.blockNumber - b.blockNumber
        : a.logIndex - b.logIndex
    );
    return events;
  }
}

function mapDeposit(d: SubgraphDeposit): DepositEvent | null {
  if (!d.commitment || d.leafIndex == null || !d.token || d.amount == null) {
    return null;
  }
  const commitment = normalizeHex(d.commitment);
  const token = normalizeHex(d.token);
  const txHash = normalizeHex(d.transactionHash);
  if (!commitment || !token || !txHash) return null;

  const blockNumber = Number(d.blockNumber);
  const logIndex = Number(d.logIndex);
  const parsedLogIndex = Number.isFinite(logIndex)
    ? logIndex
    : parseLogIndex(d.id, d.transactionHash);

  return {
    commitment,
    leafIndex: Number(d.leafIndex),
    token,
    amount: BigInt(d.amount),
    blockNumber,
    // Subgraph has no block hash — synthetic placeholder (uniqueness uses tx+log).
    blockHash: syntheticBlockHash(blockNumber),
    txHash,
    logIndex: parsedLogIndex,
  };
}

function parseLogIndex(id: string, txHash: string): number {
  const lowerTx = txHash.toLowerCase();
  const lowerId = id.toLowerCase();
  if (lowerId.startsWith(lowerTx + "-")) {
    const n = Number(lowerId.slice(lowerTx.length + 1));
    if (Number.isFinite(n)) return n;
  }
  const parts = id.split("-");
  const last = Number(parts[parts.length - 1]);
  return Number.isFinite(last) ? last : 0;
}

function normalizeHex(value: string): `0x${string}` | null {
  const v = (value.startsWith("0x") ? value : `0x${value}`).toLowerCase();
  if (!/^0x[a-f0-9]+$/.test(v)) return null;
  return v as `0x${string}`;
}

function syntheticBlockHash(blockNumber: number): `0x${string}` {
  return `0x${blockNumber.toString(16).padStart(64, "0")}` as `0x${string}`;
}
