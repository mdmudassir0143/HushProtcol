import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy · Hushh Protocol",
  description:
    "What Hushh Protocol hides on Arc, and what it does not. ZK membership proofs, fixed notes, honest limits.",
};

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl py-12 text-left">
      <h1 className="text-4xl font-bold tracking-tight">Privacy</h1>
      <p className="mt-4 text-lg text-graphite">
        What Hushh Protocol hides on Arc, and what it does not. Stated plainly, because
        privacy claims you can not check are worthless.
      </p>

      <h2 className="mt-12 text-2xl font-bold tracking-tight">
        What stays private
      </h2>
      <ul className="mt-4 space-y-4 text-graphite">
        <li>
          <span className="font-semibold text-ink">
            No on-chain link between deposit and withdraw.
          </span>{" "}
          The recipient withdraws with a Groth16 zero-knowledge proof that a
          note is in the Merkle tree, without saying which leaf. The withdraw
          transaction carries a nullifier, never the commitment from your
          deposit.
        </li>
        <li>
          <span className="font-semibold text-ink">
            Payments to the same person do not share an on-chain tag.
          </span>{" "}
          Each payment is its own Poseidon commitment. Ten payments are ten
          unrelated notes in the pool.
        </li>
        <li>
          <span className="font-semibold text-ink">
            Amounts carry no distinctive signal.
          </span>{" "}
          Notes use fixed USDC sizes (for example 1, 10, 50, 100), so an amount
          alone cannot match a deposit to a withdraw.
        </li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold tracking-tight">
        What does not
      </h2>
      <ul className="mt-4 space-y-4 text-graphite">
        <li>
          <span className="font-semibold text-ink">
            Amounts are standardized, not encrypted.
          </span>{" "}
          A 50 USDC note is a visible 50 USDC ERC-20 transfer into the pool.
          Privacy comes from everyone using the same sizes, not from hiding
          balances.
        </li>
        <li>
          <span className="font-semibold text-ink">
            Username resolution is off-chain.
          </span>{" "}
          Looking up <span className="font-mono text-ink">@username</span> hits
          the Hushh Protocol backend. The server can see who looked up whom. It does not
          learn which on-chain note resulted.
        </li>
        <li>
          <span className="font-semibold text-ink">
            Merkle roots are posted by a relayer.
          </span>{" "}
          An indexer watches deposits, builds the Poseidon tree, and posts roots
          on-chain. That operator is trusted for liveness and for posting
          correct roots. Decentralizing it is future work.
        </li>
        <li>
          <span className="font-semibold text-ink">
            The crowd is still small.
          </span>{" "}
          Unlinkability hides you among deposits in the pool. While volume is
          low, that crowd is thin, and it strengthens as usage grows.
        </li>
        <li>
          <span className="font-semibold text-ink">
            Trusted setup is demo-grade.
          </span>{" "}
          Groth16 needs a ceremony. The current keys are fine for Arc Testnet
          demos, not for production mainnet custody of large funds.
        </li>
      </ul>

      <p className="mt-12 text-sm text-graphite">
        Network: Arc Testnet (chain id 5042002). Explorer:{" "}
        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline-offset-2 hover:underline"
        >
          testnet.arcscan.app
        </a>
        .
      </p>
    </div>
  );
}
