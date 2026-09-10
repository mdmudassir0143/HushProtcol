# Bullet ZK Protocol (EVM / arc-contracts)

Status: locked for Phase 2. Matches `contracts/BulletPool.sol` + `IVerifier`.

## Statement

> I know a `secret` whose commitment is a leaf of the Merkle tree at public
> `root`, and the public `nullifier` is correctly derived from that secret.

Deposit needs **no** circuit. Only withdraw does.

## Private inputs (never on-chain)

| Name | Type | Notes |
|------|------|-------|
| `secret` | Fr | Random field element |
| `pathElements[20]` | Fr[] | Merkle siblings |
| `pathIndices[20]` | {0,1}[] | 0 = current is left child |

## Public inputs (order locked — must match verifier)

| # | Name | Encoding |
|---|------|----------|
| 0 | `root` | Poseidon Merkle root |
| 1 | `nullifier` | `Poseidon₁([secret])` |
| 2 | `recipientDigest` | Per-payment stealth digest (Fr) |
| 3 | `amount` | Raw ERC-20 amount (wei / token base units) |
| 4 | `tokenHash` | `uint256(uint160(tokenAddress))` |

## Derivations

```
nullifier  = Poseidon([secret])                          // arity 1
commitment = Poseidon([secret, recipientDigest, amount, tokenHash])  // arity 4
```

Merkle: depth **20**, Poseidon₂ hash, leaf = commitment.

Arity differs (1 vs 4) for domain separation between nullifier and commitment.

## Curve

**BN254 (bn128)** — Ethereum Groth16. Circom default (`-p bn128`).

Uses circomlib Poseidon (BN254 constants). Matches `circomlibjs` in the SDK.

## Contract binding

`BulletPool.withdraw` passes:

- `root`, `nullifier`, `recipientDigest`, `amount` as public inputs
- `tokenHash = uint256(uint160(token))` derived on-chain from the payout token
- `recipient` / `token` used only for the ERC-20 transfer (not in the circuit)

A front-runner cannot redirect payout without knowing `secret` (commitment binds
`recipientDigest` + `amount` + `tokenHash`).

## Trust

Hackathon: own Powers-of-Tau + zkey contribution. Intermediate `.ptau` / toxic
waste are gitignored. Production needs an MPC ceremony.
