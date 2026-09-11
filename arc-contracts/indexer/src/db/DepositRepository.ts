import {ObjectId, type Db, type WithId} from "mongodb";
import {connectDb, getDb} from "./client.js";
import type {DepositRecord, SyncState} from "../types/index.js";

type DepositDoc = {
  commitment: string;
  leaf_index: number;
  token: string;
  amount: string;
  block_number: number;
  block_hash: string;
  tx_hash: string;
  log_index: number;
  finalized: boolean;
  created_at: Date;
};

type RootDoc = {
  root: string;
  leaf_count: number;
  block_number: number | null;
  posted: boolean;
  posted_tx_hash: string | null;
  created_at: Date;
};

type SyncDoc = {
  _id: string;
  last_processed_block: number;
  last_root: string | null;
  tree_depth: number;
  updated_at: Date;
};

function isDuplicateKey(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as {code: number}).code === 11000
  );
}

function mapDeposit(doc: WithId<DepositDoc>): DepositRecord {
  return {
    id: String(doc._id),
    commitment: doc.commitment,
    leafIndex: doc.leaf_index,
    token: doc.token,
    amount: doc.amount,
    blockNumber: doc.block_number,
    blockHash: doc.block_hash,
    txHash: doc.tx_hash,
    logIndex: doc.log_index,
    finalized: doc.finalized,
    createdAt: doc.created_at,
  };
}

function deposits(db: Db = getDb()) {
  return db.collection<DepositDoc>("deposits");
}

function roots(db: Db = getDb()) {
  return db.collection<RootDoc>("merkle_roots");
}

function syncState(db: Db = getDb()) {
  return db.collection<SyncDoc>("sync_state");
}

export class DepositRepository {
  async insertIgnore(d: DepositRecord): Promise<boolean> {
    try {
      await deposits().insertOne({
        commitment: d.commitment.toLowerCase(),
        leaf_index: d.leafIndex,
        token: d.token.toLowerCase(),
        amount: d.amount,
        block_number: d.blockNumber,
        block_hash: d.blockHash.toLowerCase(),
        tx_hash: d.txHash.toLowerCase(),
        log_index: d.logIndex,
        finalized: d.finalized,
        created_at: new Date(),
      });
      return true;
    } catch (err) {
      if (isDuplicateKey(err)) return false;
      throw err;
    }
  }

  async markFinalized(id: string): Promise<void> {
    await deposits().updateOne(
      {_id: new ObjectId(id)},
      {$set: {finalized: true}}
    );
  }

  async findByCommitment(commitment: string): Promise<DepositRecord | null> {
    const doc = await deposits().findOne({
      commitment: commitment.toLowerCase(),
    });
    return doc ? mapDeposit(doc) : null;
  }

  async listFinalizedOrdered(): Promise<DepositRecord[]> {
    const docs = await deposits()
      .find({finalized: true})
      .sort({leaf_index: 1})
      .toArray();
    return docs.map(mapDeposit);
  }

  async listPendingFinalization(maxBlock: number): Promise<DepositRecord[]> {
    const docs = await deposits()
      .find({finalized: false, block_number: {$lte: maxBlock}})
      .sort({leaf_index: 1, log_index: 1})
      .toArray();
    return docs.map(mapDeposit);
  }

  async countFinalized(): Promise<number> {
    return deposits().countDocuments({finalized: true});
  }

  async nextExpectedLeafIndex(): Promise<number> {
    const top = await deposits()
      .find({finalized: true})
      .sort({leaf_index: -1})
      .limit(1)
      .project({leaf_index: 1})
      .toArray();
    if (!top[0]) return 0;
    return top[0].leaf_index + 1;
  }
}

export class RootRepository {
  async upsert(
    root: string,
    leafCount: number,
    blockNumber: number | null
  ): Promise<void> {
    try {
      await roots().insertOne({
        root: root.toLowerCase(),
        leaf_count: leafCount,
        block_number: blockNumber,
        posted: false,
        posted_tx_hash: null,
        created_at: new Date(),
      });
    } catch (err) {
      if (isDuplicateKey(err)) return;
      throw err;
    }
  }

  async markPosted(root: string, txHash: string): Promise<void> {
    await roots().updateOne(
      {root: root.toLowerCase()},
      {$set: {posted: true, posted_tx_hash: txHash.toLowerCase()}}
    );
  }

  async latest(): Promise<{
    root: string;
    leafCount: number;
    posted: boolean;
  } | null> {
    const doc = await roots().find().sort({leaf_count: -1}).limit(1).next();
    if (!doc) return null;
    return {
      root: doc.root,
      leafCount: doc.leaf_count,
      posted: doc.posted,
    };
  }

  async count(): Promise<number> {
    return roots().countDocuments();
  }

  async unposted(): Promise<string[]> {
    const docs = await roots()
      .find({posted: false})
      .sort({leaf_count: 1})
      .project({root: 1})
      .toArray();
    return docs.map((d) => d.root);
  }
}

export class SyncStateRepository {
  async get(): Promise<SyncState> {
    await connectDb();
    const row = await syncState().findOne({_id: "singleton"});
    if (!row) {
      return {
        lastProcessedBlock: 0,
        lastRoot: null,
        treeDepth: 20,
        updatedAt: new Date(),
      };
    }
    return {
      lastProcessedBlock: row.last_processed_block,
      lastRoot: row.last_root,
      treeDepth: row.tree_depth,
      updatedAt: row.updated_at,
    };
  }

  async update(partial: {
    lastProcessedBlock?: number;
    lastRoot?: string | null;
    treeDepth?: number;
  }): Promise<void> {
    const cur = await this.get();
    await syncState().updateOne(
      {_id: "singleton"},
      {
        $set: {
          last_processed_block:
            partial.lastProcessedBlock ?? cur.lastProcessedBlock,
          last_root:
            partial.lastRoot === undefined ? cur.lastRoot : partial.lastRoot,
          tree_depth: partial.treeDepth ?? cur.treeDepth,
          updated_at: new Date(),
        },
      },
      {upsert: true}
    );
  }
}
