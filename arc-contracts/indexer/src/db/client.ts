import {MongoClient, type Db} from "mongodb";
import {config} from "../config/index.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(config.databaseUrl);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not connected — call connectDb() / migrate() first");
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/** Ensure collections + unique indexes (idempotent). */
export async function migrate(): Promise<void> {
  const database = await connectDb();

  await database.collection("deposits").createIndexes([
    {key: {commitment: 1}, unique: true, name: "deposits_commitment_unique"},
    {key: {leaf_index: 1}, unique: true, name: "deposits_leaf_index_unique"},
    {
      key: {tx_hash: 1, log_index: 1},
      unique: true,
      name: "deposits_tx_log_unique",
    },
    {key: {block_number: 1}, name: "deposits_block_idx"},
    {key: {finalized: 1, leaf_index: 1}, name: "deposits_finalized_idx"},
  ]);

  await database.collection("merkle_roots").createIndexes([
    {key: {root: 1}, unique: true, name: "merkle_roots_root_unique"},
    {key: {leaf_count: -1}, name: "merkle_roots_leaf_count_idx"},
  ]);

  await database.collection<{
    _id: string;
    last_processed_block: number;
    last_root: string | null;
    tree_depth: number;
    updated_at: Date;
  }>("sync_state").updateOne(
    {_id: "singleton"},
    {
      $setOnInsert: {
        last_processed_block: 0,
        last_root: null,
        tree_depth: 20,
        updated_at: new Date(),
      },
    },
    {upsert: true}
  );

  console.log("[db] MongoDB indexes + sync_state ready");
}
