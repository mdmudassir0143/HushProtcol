import {BigInt, Bytes} from "@graphprotocol/graph-ts";
import {
  Deposit as DepositEvent,
  Withdrawal as WithdrawalEvent,
  TokenAdded as TokenAddedEvent,
  TokenRemoved as TokenRemovedEvent,
} from "../generated/BulletPool/BulletPool";
import {
  Deposit,
  Withdrawal,
  TokenAdded,
  TokenRemoved,
} from "../generated/schema";

function eventId(txHash: Bytes, logIndex: BigInt): string {
  return txHash.toHexString() + "-" + logIndex.toString();
}

export function handleDeposit(event: DepositEvent): void {
  const entity = new Deposit(
    eventId(event.transaction.hash, event.logIndex)
  );
  entity.commitment = event.params.commitment;
  entity.leafIndex = event.params.leafIndex;
  entity.token = event.params.token;
  entity.amount = event.params.amount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.save();
}

export function handleWithdrawal(event: WithdrawalEvent): void {
  const entity = new Withdrawal(
    eventId(event.transaction.hash, event.logIndex)
  );
  entity.nullifier = event.params.nullifier;
  entity.recipient = event.params.recipient;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.save();
}

export function handleTokenAdded(event: TokenAddedEvent): void {
  const entity = new TokenAdded(
    eventId(event.transaction.hash, event.logIndex)
  );
  entity.token = event.params.token;
  entity.decimals = event.params.decimals;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleTokenRemoved(event: TokenRemovedEvent): void {
  const entity = new TokenRemoved(
    eventId(event.transaction.hash, event.logIndex)
  );
  entity.token = event.params.token;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
