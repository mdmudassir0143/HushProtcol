import type {PublicClient} from "viem";
import {parseAbiItem} from "viem";
import {config} from "../config/index.js";
import type {DepositEvent} from "../types/index.js";
import type {DepositSource} from "../subgraph/SubgraphDepositSource.js";

const depositEvent = parseAbiItem(
  "event Deposit(bytes32 indexed commitment, uint32 indexed leafIndex, address indexed token, uint256 amount)"
);

/**
 * Polls BulletPool Deposit events via eth_getLogs (RPC fallback).
 */
export class RpcDepositSource implements DepositSource {
  constructor(private readonly client: PublicClient) {}

  async latestBlock(): Promise<number> {
    return Number(await this.client.getBlockNumber());
  }

  async fetchDeposits(
    fromBlock: number,
    toBlock: number
  ): Promise<DepositEvent[]> {
    if (toBlock < fromBlock) return [];

    const logs = await this.client.getLogs({
      address: config.poolAddress,
      event: depositEvent,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    const events: DepositEvent[] = [];
    for (const log of logs) {
      if (
        log.blockNumber == null ||
        log.blockHash == null ||
        log.transactionHash == null
      ) {
        continue;
      }
      const {commitment, leafIndex, token, amount} = log.args;
      if (
        commitment == null ||
        leafIndex == null ||
        token == null ||
        amount == null
      ) {
        continue;
      }
      events.push({
        commitment,
        leafIndex: Number(leafIndex),
        token,
        amount,
        blockNumber: Number(log.blockNumber),
        blockHash: log.blockHash,
        txHash: log.transactionHash,
        logIndex: log.logIndex ?? 0,
      });
    }

    events.sort((a, b) =>
      a.blockNumber !== b.blockNumber
        ? a.blockNumber - b.blockNumber
        : a.logIndex - b.logIndex
    );
    return events;
  }
}

/** @deprecated Prefer RpcDepositSource / SubgraphDepositSource */
export class EventWatcher extends RpcDepositSource {}
