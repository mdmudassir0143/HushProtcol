Watches `BulletPool` deposits (via **Goldsky** or RPC), maintains the canonical
Poseidon Merkle tree, posts roots to `MerkleRootManager`, and serves membership
witnesses.

**Never** stores secrets. **Never** generates ZK proofs.

```
Goldsky Deposit (or RPC logs)
    → ingest (pending)
    → wait CONFIRMATIONS
    → insert leaf (in leafIndex order)
    → compute root
    → postRoot()   ← indexer / relayer (verifier path)
    → GET /witness/:commitment
```

Goldsky = data fetcher. Indexer = tree + root poster + witness API.

## Layout

```
indexer/src/
├── goldsky/          GraphQL deposit + root sources
├── watcher/          RPC eth_getLogs fallback
├── merkle/PoseidonTree.ts
├── blockchain/RootPoster.ts
├── db/          schema + repositories
├── api/routes.ts
├── services/SyncService.ts
├── config/
├── types/
└── main.ts
```

## Setup

```bash
cd arc-contracts
pnpm sdk:build
pnpm --dir indexer install --ignore-workspace
cp indexer/.env.example indexer/.env
# fill RELAYER_PRIVATE_KEY + DATABASE_URL
# Goldsky URLs default to the public BulletPool / MerkleRootManager subgraphs
```

MongoDB Atlas:

```bash
# Set DATABASE_URL in indexer/.env (db name: hushh_indexer)
pnpm --dir indexer db:migrate
```

Run:

```bash
pnpm --dir indexer dev
# API: http://127.0.0.1:4010
```

## Env

| Var | Meaning |
|-----|---------|
| `EVENT_SOURCE` | `goldsky` (default) or `rpc` |
| `GOLDSKY_BULLET_POOL_URL` | Deposit subgraph GraphQL endpoint |
| `GOLDSKY_ROOT_MANAGER_URL` | RootPosted subgraph (skip redundant postRoot) |
| `RPC_URL` | EVM JSON-RPC (still needed for `postRoot`) |
| `BULLET_POOL_ADDRESS` | Pool address |
| `MERKLE_ROOT_MANAGER_ADDRESS` | Root poster target |
| `RELAYER_PRIVATE_KEY` | Must **own** MerkleRootManager |
| `DATABASE_URL` | MongoDB Atlas (`…/hushh_indexer`) |
| `CONFIRMATIONS` | Blocks before finalizing a leaf (default 8) |
| `SKIP_POST_ROOT=1` | Build tree + API without posting |

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | status, eventSource, lastBlock, latestRoot |
| GET | `/root` | latest root + leafCount |
| GET | `/witness/:commitment` | siblings + pathIndices (no secret) |
| GET | `/deposit/:commitment` | deposit metadata |
| GET | `/stats` | leaves, roots, latestRoot |

## Recovery

On restart the indexer:

1. Loads finalized deposits from MongoDB in `leaf_index` order
2. Rebuilds the in-memory Poseidon tree
3. Re-posts the latest root if needed
4. Continues from `sync_state.last_processed_block`

Never rebuilds from zero unless the DB is empty.
