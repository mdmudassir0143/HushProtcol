> **Status:** ACTIVE. Binding for the Arc / EVM rebuild.
> **Network:** Arc Testnet (chainId `5042002`).
> **Binding scope:** P0 below. P1/P2/P3 are out of scope unless the owner
> says otherwise in writing.
>
> This replaces the prior Stellar / Soroban SPEC. The active implementation
> lives in `arc-contracts/`.

---

## 1. What Hush is

Hush is a **ZK-private payment rail on Arc (EVM)**. It lets a sender deposit
USDC (and other registered ERC-20s) as fixed-denomination notes, and lets a
recipient withdraw with a zero-knowledge proof, while hiding the
**deposit↔withdraw link** on-chain.

The name is the product: **fast** (send without address exchange once social
delivery lands), **small** (payments travel as fixed-denomination notes), and
**silent** (no on-chain trace connecting deposit to withdraw).

Privacy model (v1, stated plainly. Do not oversell):

- **One-time commitments.** Each payment is its own Poseidon commitment leaf.
  Ten payments = ten separate notes. Repeat payments to the same person do not
  share an on-chain identity tag when stealth digests are used.
- **Fixed-denomination notes (UX presets, e.g. 1 / 10 / 50 / 100 USDC) for
  amount-matching resistance.** Same idea Tornado Cash uses for amounts only:
  round sizes carry no distinctive amount signal to re-link deposit to withdraw.
- **NOT encrypted balances.** The amount is standardized, not hidden. A 50 USDC
  note is still a visible 50 USDC ERC-20 transfer. Privacy comes from everyone
  using the same sizes. Larger payments are composed from several notes.
- **Full shielded pool (arbitrary encrypted amounts) is P3, not v1.** Pedersen
  commitments + range proofs are deferred: security-critical and only meaningful
  at real volume.
- **Email / claim links are convenience channels only.** Providers or anyone
  with the link can see delivery metadata. On-chain unlinkability still holds.
- **Trusted setup:** own Groth16 Powers-of-Tau + zkey for demo. Fine for demo,
  not for production. Intermediate `.ptau` / toxic waste must never be
  committed. Production path is an MPC ceremony.

---

## 2. Core flow

```
Sender                    BulletPool (EVM)              Indexer              Recipient
|  pick amount + token       |                            |                     |
|  SDK: secret + commitment  |                            |                     |
|  deposit(token,amount,C) --> transferFrom + emit Deposit|                     |
|                            |  Deposit(C, leafIndex, …)→ | insert leaf         |
|                            |                            | compute root        |
|                            |  <--- postRoot(root) ------|                     |
|                            |                            |                     |
|                            |                            |  GET /witness/:C  → |
|                            |                            |                     |
|                            |   <--- withdraw(proof, ----|                     |
|                            |        root, nullifier,    |                     |
|                            |        recipientDigest,    |                     |
|                            |        recipient, token,   |                     |
|                            |        amount)             |                     |
|                            |  verify Groth16            |                     |
|                            |  check nullifier unused    |                     |
|                            |  mark nullifier used       |                     |
|                            |  ERC-20 transfer out       |                     |
|                            |  emit Withdrawal           |                     |
```

No on-chain field links the deposit tx to the withdraw tx. The withdraw event
carries the nullifier (and recipient), never the commitment.

---

## 3. Delivery channels (application layer)

How the recipient learns they were paid (after the protocol MVP works):

- **Registered user (hero flow).** Encrypted inbox note. User opens the app,
  decrypts with their Hush key, sees claimable notes, proves in-browser.
- **Unregistered, paid by email.** Claim link via email (P1). Provider sees the
  link.
- **Unregistered, paid by X handle.** Copy-paste claim link by design. No
  automated DMs (spam risk). Sender delivers the message themselves.

Protocol MVP does **not** require social delivery. Deposit → indexer → witness
→ proof → withdraw is enough to prove the rail works.

---

## 4. P0 scope (BINDING)

Build order (do not invert: backend depends on the ZK flow, not the reverse):

```
Contracts → ZK circuit → Proof SDK → Indexer → Backend → Frontend
```

Indexer is required before a full end-to-end withdraw against posted roots.
Frontend may integrate against a local tree first, but production withdraw
needs the indexer.

### P0.1 Contracts (`arc-contracts/contracts`) — DONE

- `BulletPool` — `deposit`, `withdraw`, nullifiers, embedded token registry,
  pause, Ownable2Step, ReentrancyGuard.
- `MerkleRootManager` — rolling window of 64 roots, `postRoot` / `isKnownRoot`.
- `IVerifier` + mock `BulletVerifier`, then generated `WithdrawVerifier`.
- `MockUSDC` for testnet.
- Hardhat tests covering deposit, withdraw, pause, bad token/amount, spent
  nullifier, unknown root, proof fail, admin.

### P0.2 Withdraw circuit (`arc-contracts/zk`) — DONE

- Single circuit: `withdraw.circom` (deposit needs no circuit).
- Groth16 over **BN254**. Circomlib Poseidon.
- Depth-20 Merkle membership + nullifier.
- Export Solidity verifier via snarkjs.

### P0.3 Proof SDK (`arc-contracts/sdk`) — DONE

- `generateSecret`, `createNote`, `generateCommitment`, `generateNullifier`
- `MerkleTree`, `generateProof`, `encodeProof`
- Frontend must call the SDK. No ad-hoc crypto in the UI.

### P0.4 Merkle indexer (`arc-contracts/indexer`) — DONE

- Watch `Deposit` events, insert leaves in `leafIndex` order.
- Confirmations before finalize. Crash recovery from MongoDB.
- `postRoot` via dedicated relayer key.
- API: `/health`, `/root`, `/witness/:commitment`, `/deposit/:commitment`,
  `/stats`. Never returns secrets. Never proves.

### P0.5 Backend (auth / users / notes) — DONE

- `POST /auth/wallet` — wallet personal_sign → JWT
- `GET /users/:username` — resolve username → wallet + bulletPublicKey
- `POST/GET /notes`, `PATCH /notes/:id/claim` — encrypted inbox only
- Lives in `arc-contracts/backend/`. No proving, no Merkle, no chain calls.

### P0.6 Frontend integration — NEXT

- Arc wallet connect (EVM).
- Deposit: SDK note → approve → `deposit` → `POST /notes`.
- Withdraw: `GET /notes` → decrypt → indexer witness → prove → `withdraw`.
- Local note storage fallback for unregistered recipients.

### P0.7 E2E on Arc Testnet

- Explorer links for deposit tx + withdraw tx with no shared commitment.
- Document addresses in `deployments/arcTestnet.json`.

---

## 5. Out of scope (do NOT build without explicit OK)

**P1 — strongly want if time allows:**

- Stealth ECDH digests as default for all sends (repeat-payment unlinkability).
- SendGrid automated email delivery (X stays copy-paste).
- Stronger indexer decentralization (multiple posters / root attestation).
- Claim UX polish (proof progress, note recovery).

**P2 — next build:**

- On-chain identity registry (decentralize handle → key).
- View tags / scan optimizations (ERC-5564-style).
- More delivery channels (QR, shareable claim card).

**P3 — future:**

- Full shielded pool with encrypted balances (Pedersen + range proofs).
- Mainnet + MPC trusted setup.
- Compliance: selective disclosure / view keys for auditors.
- Programmatic payers (keep `deposit` callable; do not build schedulers now).

Reaching for any of these = stop and ask.

---

## 6. Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Network | Arc Testnet | chainId `5042002`, RPC `https://rpc.testnet.arc.network`, explorer [testnet.arcscan.app](https://testnet.arcscan.app) |
| Contracts | Solidity 0.8.28, Hardhat, OpenZeppelin | `arc-contracts/contracts/` |
| ZK | Circom + snarkjs, Groth16 / BN254 | `arc-contracts/zk/` |
| SDK | TypeScript, circomlibjs, snarkjs | `arc-contracts/sdk/` |
| Indexer | Node, Fastify, viem, MongoDB | `arc-contracts/indexer/` |
| Backend | Fastify + Prisma (MongoDB) | `arc-contracts/backend/` — auth, users, notes |
| Frontend | Next.js + TS + Tailwind | `frontend/` — types in `src/shared/`, EVM wallet next |
| Asset | ERC-20 USDC (+ MockUSDC on testnet) | registry inside `BulletPool` |

Active path: `arc-contracts/`. Legacy Stellar/Soroban trees are not binding.

---

## 7. ZK / cryptographic design (security-sensitive)

**Proof system (LOCKED):** Groth16 over **BN254 (bn128)**, verified on-chain by
the snarkjs-exported Solidity verifier (`WithdrawVerifier`).

**Statement:** Prover knows `secret` such that:

```
nullifier  = Poseidon₁([secret])
commitment = Poseidon₄([secret, recipientDigest, amount, tokenHash])
commitment is a leaf under public root (depth 20, Poseidon₂)
```

**Public inputs (order locked):**

```
[root, nullifier, recipientDigest, amount, tokenHash]
```

- `amount` — raw ERC-20 base units (e.g. 10e6 for 10 USDC with 6 decimals).
- `tokenHash` — `uint256(uint160(token))`, also derived in `BulletPool.tokenHashOf`.

**Private inputs:** `secret`, `pathElements[20]`, `pathIndices[20]`.

**Nullifier:** revealed at withdraw. Contract stores spent nullifiers permanently
(with TTL bumps on EVM as implemented). Flawed nullifier check = double-drain.
Adversarial tests required.

**Front-running:** `recipientDigest`, `amount`, and `tokenHash` are inside the
commitment. A watcher cannot redirect or up-value a withdraw without `secret`.

**Merkle (Option B):** tree is off-chain. Indexer is the only writer. Contract
stores a window of posted roots. Claim/withdraw must use a known root.

**Trusted setup:** own ceremony for demo. `withdraw_vk.json` may be committed.
Intermediate ptau / zkey toxic paths are gitignored. Production = MPC.

Details: `arc-contracts/zk/PROTOCOL.md`.

---

## 8. Threat model (honest limits)

- **On-chain:** deposit↔withdraw unlinkable (membership proof, no commitment on
  withdraw). Repeat-payment unlinkability needs stealth digests.
- **Amount privacy:** standardized denominations, not encryption. The number is
  public on the ERC-20 transfer.
- **Indexer / relayer:** trusted to insert only real deposits and post correct
  roots. A malicious poster that inserts fake leaves can enable theft. A stalled
  poster blocks withdraws. Documented as Option B trust seam.
- **Off-chain:** resolver and email see metadata. Privacy-maximizing users use
  local notes / copy-paste links.
- **Trusted setup:** soundness depends on ceremony honesty until MPC.
- **Pool size:** demo anonymity set is thin. Copy must not claim strong
  anonymity.

---

## 9. Contract surface (reference)

```
deposit(token, amount, commitment) → leafIndex
  emits Deposit(commitment, leafIndex, token, amount)

withdraw(proof, root, nullifier, recipientDigest, recipient, token, amount)
  emits Withdrawal(nullifier, recipient)

MerkleRootManager.postRoot(root)
MerkleRootManager.isKnownRoot(root)
```

Token registry is embedded in `BulletPool` (`addToken` / `removeToken` /
`isSupported`). Verifier and root manager are swappable by owner.

---

## 10. Workflow & rules

Implementation work for the Arc stack lives under `arc-contracts/`. Prefer small
reviewable commits.

Hard rules:

- Never commit secrets, private keys, or toxic-waste ptau intermediates.
- No silent scope creep past P0.
- Security-sensitive code (nullifier, verifier, key derivation, root posting)
  gets called out and tested.
- Be honest about privacy in all user-facing copy (see CLAUDE.md copywriting
  rules: no em dashes, no LIVE badges, no oversell).
- Ask before adding heavy crypto deps or files >1MB.

---

## 11. Network config (Hardhat)

```
Network name:  arcTestnet
Chain ID:      5042002
Currency:      USDC
RPC:           https://rpc.testnet.arc.network
Explorer:      https://testnet.arcscan.app
```

Deploy: `pnpm deploy:all --network arcTestnet` from `arc-contracts/`.
