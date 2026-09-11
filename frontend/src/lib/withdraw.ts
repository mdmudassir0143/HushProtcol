import {
  bytes32ToFr,
  generateProof,
  noteFromJSON,
  publicInputBytes32,
  tokenHash,
  type MerkleProof,
  type NoteJSON,
} from "@bullet/sdk";
import {fetchWitness} from "@/lib/api";
import {resolvePoolToken} from "@/lib/config";

export type ClaimStep =
  | "idle"
  | "witness"
  | "proving"
  | "withdrawing"
  | "marking"
  | "done"
  | "error";

const CIRCUITS = {
  wasmPath: "/circuits/withdraw.wasm",
  zkeyPath: "/circuits/withdraw.zkey",
} as const;

export function claimStepLabel(step: ClaimStep): string {
  switch (step) {
    case "witness":
      return "Fetching Merkle witness…";
    case "proving":
      return "Proving (may take a minute)…";
    case "withdrawing":
      return "Confirm withdraw in wallet…";
    case "marking":
      return "Marking claimed…";
    case "done":
      return "Claimed";
    default:
      return "Claim";
  }
}

/**
 * Build BulletPool.withdraw args from a decrypted note.
 * Requires indexer to have finalized the deposit and posted a root.
 */
export async function prepareWithdraw(params: {
  payload: NoteJSON;
  recipient: `0x${string}`;
  onStep?: (step: ClaimStep) => void;
}) {
  const {payload, recipient} = params;
  const note = noteFromJSON(payload);
  const expected = tokenHash(recipient);
  if (note.recipientDigest !== expected) {
    throw new Error(
      "This note is bound to a different wallet. Connect the recipient wallet."
    );
  }

  params.onStep?.("witness");
  const commitment =
    payload.commitmentBytes32 ||
    (`0x${BigInt(payload.commitment).toString(16).padStart(64, "0")}` as `0x${string}`);

  const witness = await fetchWitness(commitment);
  if (!witness) {
    throw new Error(
      "Witness not ready. Indexer has not finalized this deposit yet. Wait for confirmations, or set START_BLOCK near the deposit and restart the indexer."
    );
  }
  if (
    witness.siblings.length !== 20 ||
    witness.pathIndices.length !== 20
  ) {
    throw new Error("Indexer returned an invalid Merkle witness.");
  }

  const merkle: MerkleProof = {
    root: bytes32ToFr(witness.root),
    pathElements: witness.siblings.map((s) => bytes32ToFr(s)),
    pathIndices: witness.pathIndices,
    leafIndex: witness.leafIndex,
  };

  params.onStep?.("proving");
  const proved = await generateProof(note, merkle, CIRCUITS);
  const pub = publicInputBytes32(proved.publicInputs);
  const poolToken = resolvePoolToken({tokenHash: payload.tokenHash});

  return {
    proof: proved.proofBytes,
    root: pub.root,
    nullifier: pub.nullifier,
    recipientDigest: pub.recipientDigest,
    recipient,
    token: poolToken.address,
    amount: BigInt(payload.amount),
  };
}
