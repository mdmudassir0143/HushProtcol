# Bullet · arc-contracts

Solidity + ZK stack for Bullet on **Arc Testnet** (EVM). Option B: off-chain Poseidon Merkle tree, on-chain Groth16 withdraw proofs.

This package is the active protocol implementation. There is no Soroban / Stellar dependency here.

---

## Network

| Setting | Value |
|---------|--------|
| Name | Arc Testnet |
| Chain ID | `5042002` |
| Currency | USDC |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | [testnet.arcscan.app](https://testnet.arcscan.app) |

Hardhat network name: `arcTestnet`.

---

## Development order

```
✅ Contracts
✅ Withdraw circuit + Proof SDK
✅ Merkle indexer
✅ Backend (auth / users / notes)
○ Frontend integration
```

---

## Layout

```
arc-contracts/
├── contracts/
│   ├── BulletPool.sol              # deposit / withdraw, nullifiers, token registry
│   ├── MerkleRootManager.sol       # last 64 roots
│   ├── BulletVerifier.sol          # mock (always true) — replace after zk:build
│   ├── MockUSDC.sol
│   ├── interfaces/
│   └── verifiers/                  # Groth16Verifier + WithdrawVerifier (generated)
├── zk/
│   ├── PROTOCOL.md
│   ├── circuits/withdraw.circom
│   └── scripts/build.sh
├── sdk/                            # @bullet/sdk — secrets, Poseidon, prove
├── indexer/                        # watch deposits, postRoot, GET /witness
├── backend/                        # wallet auth, usernames, encrypted notes
├── scripts/deploy/                 # deploy-all, token ops
├── scripts/ops/                    # post-root, pause, status
├── test/
└── deployments/                    # arcTestnet.json, etc.
```

### Public inputs (locked)

```
[root, nullifier, recipientDigest, amount, tokenHash]
```

`tokenHash = uint256(uint160(token))` — also computed on-chain in `BulletPool.tokenHashOf`.

Deposit needs **no** circuit. Only withdraw does.

---

## Setup

```bash
cd arc-contracts
pnpm install --ignore-workspace
cp .env.example .env    # PRIVATE_KEY=...
pnpm test
```

### ZK + SDK

```bash
# Circom must be on PATH:
#   cargo install --git https://github.com/iden3/circom.git circom --locked
pnpm zk:install && pnpm zk:build
pnpm sdk:install && pnpm sdk:build && pnpm sdk:test
```

After `zk:build`, deploy `WithdrawVerifier` and call `pool.setVerifier(...)`.

### Indexer

```bash
pnpm indexer:install
cp indexer/.env.example indexer/.env
# RPC_URL=https://rpc.testnet.arc.network
# CHAIN_ID=5042002
# BULLET_POOL_ADDRESS / MERKLE_ROOT_MANAGER_ADDRESS from deployments/arcTestnet.json
# RELAYER_PRIVATE_KEY must own MerkleRootManager
# DATABASE_URL=mongodb+srv://USER:PASSWORD@HOST/hushh_indexer?retryWrites=true&w=majority

pnpm indexer:migrate
pnpm indexer:dev        # http://127.0.0.1:4010
```

### Backend

```bash
pnpm backend:install
pnpm backend:db         # prisma generate + db push (MongoDB)
pnpm backend:dev        # http://127.0.0.1:4020
```

---

## Deploy (Arc Testnet)

Requires `PRIVATE_KEY` in `.env` (funded on Arc Testnet). Scripts default to `--network arcTestnet`.

```bash
pnpm compile
pnpm deploy          # or: pnpm deploy:arc / pnpm deploy:all
pnpm status
```

Writes `deployments/arcTestnet.json` (pool, root manager, verifier, MockUSDC).

Current Arc Testnet (2026-07-22):

| Contract | Address |
|----------|---------|
| BulletPool | `0x9E65584C6ACE76cEFde4FD5f50E6bB9763999dCe` |
| MerkleRootManager | `0x6D6530A1fC908792DA2aa533a5F299283E6F062a` |
| BulletVerifier | `0x0A95c430Bf6AA3140A4Bf04C8D5982472331008d` |
| MockUSDC | `0x7d7aF5715e5671e0E3126b2428Dc2629bD9061e3` |

Token helpers:

```bash
pnpm deploy:token
TOKEN_ADDRESS=0x... pnpm add:token
MINT_AMOUNT=1000 pnpm mint:token
ROOT=0x... pnpm post:root
```

Local Hardhat node only:

```bash
pnpm deploy:local
```

Env knobs: see `.env.example` (`RELAYER_ADDRESS`, `MINT_*`, `SKIP_TOKEN`, …).

---

## Protocol sketch

1. **Deposit** — SDK builds commitment → `deposit(token, amount, commitment)` → indexer inserts leaf → `postRoot`.
2. **Withdraw** — `GET /witness/:commitment` → SDK `generateProof` → `withdraw(proof, root, nullifier, recipientDigest, recipient, token, amount)`.

```ts
import {createNote, generateProof, encodeProof} from "@bullet/sdk";
```

Frontend calls the SDK. The indexer never sees secrets. The backend never proves.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm test` | Contract tests (local Hardhat) |
| `pnpm deploy` | Full deploy to Arc Testnet |
| `pnpm status` | Addresses + on-chain status (Arc) |
| `pnpm deploy:local` | Deploy to local Hardhat node |
| `pnpm zk:build` | Circuit → verifier Solidity |
| `pnpm sdk:test` | SDK unit tests |
| `pnpm indexer:dev` | Indexer API |

---

## Security notes

- `ReentrancyGuard` + `Pausable` + `Ownable2Step` on the pool.
- Custom errors on hot paths.
- Mock verifier must never hold real funds.
- Relayer key is for `postRoot` only. Never store user secrets in the indexer.
