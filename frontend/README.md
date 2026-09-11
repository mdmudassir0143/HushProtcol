# Hushh Protocol frontend

Self-contained Next.js app for Arc Testnet. Wired to backend auth / notes and on-chain deposit.

```bash
# 1. Backend
cd arc-contracts && pnpm backend:dev   # :4020

# 2. Frontend
cd frontend
pnpm install
pnpm dev                               # :3000
```

## Wallet

Browser extension wallets via wagmi `injected` (MetaMask, etc.). Arc Testnet `5042002`.

Optional WalletConnect Cloud id (unused while we stay injected-only):

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=367e7033f1d106ae8bdbbd60e7c478a9
```


1. Open `/register` → connect MetaMask (Arc Testnet 5042002) → pick `@username` → sign.
2. Mint test USDC to your wallet:
   ```bash
   cd arc-contracts
   MINT_TO=0xYourWallet MINT_AMOUNT=1000 pnpm mint:token
   ```
3. Open `/send` as another registered user → resolve `@username` → pick amount → approve + deposit.
4. Start indexer (needed for claim):
   ```bash
   cd arc-contracts && pnpm indexer:dev   # :4010
   ```
5. Recipient opens `/inbox` → **Claim** → wait for witness + Groth16 prove → confirm withdraw in wallet.
