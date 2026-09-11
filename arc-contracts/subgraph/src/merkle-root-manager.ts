import {BigInt, Bytes} from "@graphprotocol/graph-ts";
import {RootPosted as RootPostedEvent} from "../generated/MerkleRootManager/MerkleRootManager";
import {RootPosted} from "../generated/schema";

function eventId(txHash: Bytes, logIndex: BigInt): string {
  return txHash.toHexString() + "-" + logIndex.toString();
}

export function handleRootPosted(event: RootPostedEvent): void {
  const entity = new RootPosted(
    eventId(event.transaction.hash, event.logIndex)
  );
  entity.root = event.params.root;
  entity.slot = event.params.slot;
  entity.postedCount = event.params.postedCount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.save();
}
