# Hush Protocol subgraph (The Graph)

Indexes `BulletPool` + `MerkleRootManager` on **Arc Testnet** (`arc-testnet`,
chain id `5042002`). The custom indexer ([`../indexer`](../indexer)) queries this
subgraph for deposit / root events, then builds the Poseidon tree and serves
witnesses.

```
Contracts → this subgraph (Studio) → indexer GraphQL client → REST /witness → frontend
```

## Entities

| Entity | Source event |
|--------|----------------|
| `Deposit` | `BulletPool.Deposit` |
| `Withdrawal` | `BulletPool.Withdrawal` |
| `TokenAdded` / `TokenRemoved` | `BulletPool` admin |
| `RootPosted` | `MerkleRootManager.RootPosted` |

Addresses and start block match [`../deployments/arcTestnet.json`](../deployments/arcTestnet.json)
and indexer `START_BLOCK` (`53078000`).

## Setup

```bash
cd arc-contracts/subgraph
pnpm install --ignore-workspace
pnpm codegen
pnpm build
```

## Deploy to The Graph Studio

1. Create a subgraph at [https://thegraph.com/studio/](https://thegraph.com/studio/)
   - Network: **Arc Testnet** (`arc-testnet`)
   - Suggested slug: `hush-protocol` (must match `package.json` `deploy` script, or change the script)

2. Authenticate and deploy:

```bash
# Deploy key from Studio → your subgraph → Access
npx graph auth --studio <DEPLOY_KEY>
pnpm deploy
# enter a version label, e.g. v0.1.0
```

3. Copy the **GraphQL Query URL** from Studio (looks like):

```
https://api.studio.thegraph.com/query/<DEPLOYMENT_ID>/hush-protocol/v0.1.0
```

4. Wire the indexer ([`../indexer/.env`](../indexer/.env.example)):

```bash
EVENT_SOURCE=subgraph
SUBGRAPH_URL=https://api.studio.thegraph.com/query/<DEPLOYMENT_ID>/hush-protocol/v0.1.0
```

5. Wait until Studio shows the subgraph synced near tip, then start the indexer.
   Remove any legacy `GOLDSKY_*` env vars from hosted indexer (e.g. Render).

## Local graph-node (optional)

```bash
pnpm create-local
pnpm deploy-local
# SUBGRAPH_URL=http://127.0.0.1:8000/subgraphs/name/hush-protocol
```

## Example queries

```graphql
{
  _meta { block { number } }
  deposits(first: 5, orderBy: leafIndex, orderDirection: asc) {
    commitment
    leafIndex
    token
    amount
    blockNumber
    transactionHash
  }
  rootPosteds(first: 5, orderBy: postedCount, orderDirection: desc) {
    root
    slot
    postedCount
  }
}
```
